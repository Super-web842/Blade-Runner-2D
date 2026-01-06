/**
 * INFINITE RPG - GAME ENGINE CORE
 * Part 1 de 20: Arquitetura Base
 * 
 * Este arquivo contém as classes fundamentais para o jogo:
 * 1. Configuração do Canvas e Renderização
 * 2. Game Loop com controle de FPS
 * 3. Gerenciador de Inputs (Teclado/Mouse)
 * 4. Sistema de Câmera para mundo infinito
 * 5. Geração Procedural de Chunks e Biomas
 */

// ============================================================================
// CONFIGURAÇÕES GLOBAIS E CONSTANTES
// ============================================================================

const GameConfig = {
    // Canvas
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    TARGET_FPS: 60,
    
    // Mundo
    CHUNK_SIZE: 64,          // Tamanho do chunk em tiles
    TILE_SIZE: 32,           // Tamanho de cada tile em pixels
    RENDER_DISTANCE: 3,      // Chunks renderizados em cada direção do jogador
    WORLD_SEED: Date.now(),  // Seed para geração procedural
    
    // Câmera
    CAMERA_SMOOTHING: 0.1,   // Suavização do movimento da câmera
    ZOOM_LEVEL: 1.0,         // Zoom inicial
    
    // Performance
    USE_REQUEST_ANIMATION_FRAME: true,
    MAX_DELTA_TIME: 0.1      // Limite para delta time (evita bugs com tabs inativas)
};

// ============================================================================
// CLASSE PRINCIPAL DO JOGO - GAME ENGINE
// ============================================================================

class GameEngine {
    constructor() {
        // Estado do jogo
        this.isRunning = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.deltaTime = 0;
        
        // Referências para sistemas principais
        this.canvas = null;
        this.context = null;
        this.inputManager = null;
        this.camera = null;
        this.world = null;
        this.player = null;
        
        // Estatísticas
        this.stats = {
            updates: 0,
            renders: 0,
            chunksLoaded: 0,
            entities: 0,
            memory: {
                chunks: 0,
                textures: 0
            }
        };
        
        // Bind para manter o contexto
        this.gameLoop = this.gameLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        this.initialize();
    }
    
    /**
     * Inicializa todos os sistemas do jogo
     */
    initialize() {
        console.log('🔄 Inicializando Infinite RPG Engine...');
        
        // 1. Setup do Canvas
        this.setupCanvas();
        
        // 2. Inicializa Gerenciador de Inputs
        this.inputManager = new InputManager();
        
        // 3. Cria Sistema de Câmera
        this.camera = new Camera(this.canvas);
        
        // 4. Cria Mundo
        this.world = new World();
        
        // 5. Cria Jogador
        this.player = new Player();
        
        // 6. Configura Event Listeners
        this.setupEventListeners();
        
        // 7. Pré-carrega assets
        this.preloadAssets().then(() => {
            console.log('✅ Engine inicializada com sucesso!');
            this.start();
        }).catch(error => {
            console.error('❌ Erro ao carregar assets:', error);
        });
    }
    
    /**
     * Configura o canvas e contexto de renderização
     */
    setupCanvas() {
        // Cria elemento canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'game-canvas';
        this.canvas.width = GameConfig.CANVAS_WIDTH;
        this.canvas.height = GameConfig.CANVAS_HEIGHT;
        
        // Estilos do canvas
        this.canvas.style.display = 'block';
        this.canvas.style.backgroundColor = '#000';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        
        // Adiciona ao documento
        document.body.appendChild(this.canvas);
        
        // Obtém contexto 2D
        this.context = this.canvas.getContext('2d');
        
        // Configura qualidade de renderização
        this.context.imageSmoothingEnabled = false;
        this.context.webkitImageSmoothingEnabled = false;
        this.context.mozImageSmoothingEnabled = false;
        
        console.log('✅ Canvas configurado:', {
            width: this.canvas.width,
            height: this.canvas.height,
            context: this.context
        });
    }
    
    /**
     * Configura listeners de eventos globais
     */
    setupEventListeners() {
        // Redimensionamento da janela
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('orientationchange', this.handleResize);
        
        // Previne comportamentos padrão indesejados
        window.addEventListener('keydown', (e) => {
            if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
                e.preventDefault();
            }
        });
        
        // Foco/Blur da janela
        window.addEventListener('blur', () => {
            this.inputManager.clearAllInputs();
        });
        
        window.addEventListener('focus', () => {
            this.inputManager.clearAllInputs();
        });
        
        // Context menu do canvas
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    }
    
    /**
     * Handler para redimensionamento da janela
     */
    handleResize() {
        GameConfig.CANVAS_WIDTH = window.innerWidth;
        GameConfig.CANVAS_HEIGHT = window.innerHeight;
        
        this.canvas.width = GameConfig.CANVAS_WIDTH;
        this.canvas.height = GameConfig.CANVAS_HEIGHT;
        
        // Notifica a câmera sobre a mudança
        this.camera.handleResize();
        
        console.log('🔄 Canvas redimensionado:', {
            width: this.canvas.width,
            height: this.canvas.height
        });
    }
    
    /**
     * Pré-carrega assets essenciais
     */
    async preloadAssets() {
        console.log('🔄 Pré-carregando assets...');
        
        // Carrega imagens de tiles básicos
        const tilePromises = [];
        
        // Cria tiles básicos programaticamente (serão substituídos por sprites)
        this.createBasicTiles();
        
        await Promise.all(tilePromises);
    }
    
    /**
     * Cria tiles básicos para debug
     */
    createBasicTiles() {
        // Tile de grama
        const grassCanvas = document.createElement('canvas');
        grassCanvas.width = GameConfig.TILE_SIZE;
        grassCanvas.height = GameConfig.TILE_SIZE;
        const grassCtx = grassCanvas.getContext('2d');
        
        // Gradiente de verde para grama
        const grassGradient = grassCtx.createLinearGradient(0, 0, 0, GameConfig.TILE_SIZE);
        grassGradient.addColorStop(0, '#7cfc00');
        grassGradient.addColorStop(1, '#32cd32');
        grassCtx.fillStyle = grassGradient;
        grassCtx.fillRect(0, 0, GameConfig.TILE_SIZE, GameConfig.TILE_SIZE);
        
        // Detalhes na grama
        grassCtx.fillStyle = '#228b22';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * GameConfig.TILE_SIZE;
            const y = Math.random() * GameConfig.TILE_SIZE;
            grassCtx.fillRect(x, y, 2, 1);
        }
        
        // Tile de floresta
        const forestCanvas = document.createElement('canvas');
        forestCanvas.width = GameConfig.TILE_SIZE;
        forestCanvas.height = GameConfig.TILE_SIZE;
        const forestCtx = forestCanvas.getContext('2d');
        
        forestCtx.fillStyle = '#006400';
        forestCtx.fillRect(0, 0, GameConfig.TILE_SIZE, GameConfig.TILE_SIZE);
        
        // Detalhes na floresta
        forestCtx.fillStyle = '#228b22';
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * GameConfig.TILE_SIZE;
            const y = Math.random() * GameConfig.TILE_SIZE;
            const size = Math.random() * 3 + 1;
            forestCtx.fillRect(x, y, size, size);
        }
        
        // Tile de deserto
        const desertCanvas = document.createElement('canvas');
        desertCanvas.width = GameConfig.TILE_SIZE;
        desertCanvas.height = GameConfig.TILE_SIZE;
        const desertCtx = desertCanvas.getContext('2d');
        
        const desertGradient = desertCtx.createLinearGradient(0, 0, 0, GameConfig.TILE_SIZE);
        desertGradient.addColorStop(0, '#f4a460');
        desertGradient.addColorStop(1, '#d2b48c');
        desertCtx.fillStyle = desertGradient;
        desertCtx.fillRect(0, 0, GameConfig.TILE_SIZE, GameConfig.TILE_SIZE);
        
        // Detalhes no deserto
        desertCtx.fillStyle = '#8b7355';
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * GameConfig.TILE_SIZE;
            const y = Math.random() * GameConfig.TILE_SIZE;
            desertCtx.beginPath();
            desertCtx.arc(x, y, 1, 0, Math.PI * 2);
            desertCtx.fill();
        }
        
        // Armazena os tiles básicos
        this.basicTiles = {
            grass: grassCanvas,
            forest: forestCanvas,
            desert: desertCanvas
        };
        
        console.log('✅ Tiles básicos criados');
    }
    
    /**
     * Inicia o loop do jogo
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        
        if (GameConfig.USE_REQUEST_ANIMATION_FRAME) {
            requestAnimationFrame(this.gameLoop);
        } else {
            setInterval(() => {
                const currentTime = performance.now();
                this.deltaTime = (currentTime - this.lastTime) / 1000;
                this.lastTime = currentTime;
                
                // Limita o delta time para evitar bugs
                this.deltaTime = Math.min(this.deltaTime, GameConfig.MAX_DELTA_TIME);
                
                this.update(this.deltaTime);
                this.render();
                
                this.frameCount++;
                
                // Calcula FPS a cada segundo
                if (currentTime > this.lastFpsUpdate + 1000) {
                    this.fps = this.frameCount;
                    this.frameCount = 0;
                    this.lastFpsUpdate = currentTime;
                }
            }, 1000 / GameConfig.TARGET_FPS);
        }
        
        console.log('🚀 Game loop iniciado');
    }
    
    /**
     * Para o loop do jogo
     */
    stop() {
        this.isRunning = false;
        console.log('⏹️ Game loop parado');
    }
    
    /**
     * Loop principal do jogo usando requestAnimationFrame
     */
    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        // Calcula delta time
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Limita o delta time
        this.deltaTime = Math.min(this.deltaTime, GameConfig.MAX_DELTA_TIME);
        
        // Atualiza lógica do jogo
        this.update(this.deltaTime);
        
        // Renderiza frame
        this.render();
        
        // Contador de FPS
        this.frameCount++;
        if (currentTime > (this.lastFpsUpdate || 0) + 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            
            // Atualiza estatísticas periodicamente
            this.updateStats();
        }
        
        // Continua o loop
        requestAnimationFrame(this.gameLoop);
    }
    
    /**
     * Atualiza lógica do jogo
     */
    update(deltaTime) {
        this.stats.updates++;
        
        // Atualiza inputs
        this.inputManager.update();
        
        // Atualiza player
        this.player.update(deltaTime, this.inputManager);
        
        // Atualiza câmera para seguir o player
        this.camera.update(this.player, deltaTime);
        
        // Atualiza mundo (carrega/descarga chunks)
        this.world.update(this.player.position);
    }
    
    /**
     * Renderiza o jogo
     */
    render() {
        this.stats.renders++;
        
        // Limpa o canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Salva estado do contexto
        this.context.save();
        
        // Aplica transformações da câmera
        this.camera.applyTransform(this.context);
        
        // Renderiza o mundo
        this.world.render(this.context, this.camera);
        
        // Renderiza o player
        this.player.render(this.context);
        
        // Restaura estado do contexto
        this.context.restore();
        
        // Renderiza UI e debug
        this.renderUI();
    }
    
    /**
     * Renderiza interface do usuário e informações de debug
     */
    renderUI() {
        this.context.save();
        
        // Desativa transformações da câmera para UI
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        
        // Informações de debug
        this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.context.fillRect(10, 10, 300, 140);
        
        this.context.fillStyle = '#ffffff';
        this.context.font = '12px monospace';
        this.context.textBaseline = 'top';
        
        const debugInfo = [
            `FPS: ${this.fps}`,
            `Delta: ${this.deltaTime.toFixed(4)}`,
            `Player: (${this.player.position.x.toFixed(1)}, ${this.player.position.y.toFixed(1)})`,
            `Chunks: ${this.stats.chunksLoaded}`,
            `Camera: (${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)})`,
            `Zoom: ${this.camera.zoom.toFixed(2)}x`,
            `Updates: ${this.stats.updates}`,
            `Renders: ${this.stats.renders}`
        ];
        
        debugInfo.forEach((info, index) => {
            this.context.fillText(info, 20, 20 + index * 18);
        });
        
        // Instruções
        this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.context.fillRect(10, this.canvas.height - 80, 250, 70);
        
        this.context.fillStyle = '#ffffff';
        const instructions = [
            'CONTROLES:',
            'WASD / Setas - Mover',
            'Scroll - Zoom',
            'R - Resetar Câmera'
        ];
        
        instructions.forEach((instruction, index) => {
            this.context.fillText(instruction, 20, this.canvas.height - 70 + index * 16);
        });
        
        this.context.restore();
    }
    
    /**
     * Atualiza estatísticas do jogo
     */
    updateStats() {
        this.stats.chunksLoaded = this.world.loadedChunks.size;
        // Futuramente: atualizar outras estatísticas
    }
}

// ============================================================================
// CLASSE INPUT MANAGER - GERENCIA TODOS OS INPUTS
// ============================================================================

class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            down: false,
            rightDown: false,
            wheel: 0
        };
        
        this.bindEvents();
    }
    
    /**
     * Vincula eventos de input
     */
    bindEvents() {
        // Eventos de teclado
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Eventos de mouse
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('wheel', (e) => this.onMouseWheel(e), { passive: false });
        
        // Eventos de toque
        document.addEventListener('touchstart', (e) => this.onTouchStart(e));
        document.addEventListener('touchmove', (e) => this.onTouchMove(e));
        document.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // Previne comportamento padrão para teclas de jogo
        document.addEventListener('keydown', (e) => {
            if ([32, 37, 38, 39, 40].includes(e.keyCode)) {
                e.preventDefault();
            }
        });
    }
    
    /**
     * Atualiza estado dos inputs
     */
    update() {
        // Reseta scroll do mouse
        this.mouse.wheel = 0;
        
        // Limpa inputs se a janela não estiver focada
        if (!document.hasFocus()) {
            this.clearAllInputs();
        }
    }
    
    /**
     * Handler para tecla pressionada
     */
    onKeyDown(e) {
        this.keys[e.key.toLowerCase()] = true;
        this.keys[e.keyCode] = true;
        
        // Evita comportamento padrão para teclas de movimento
        if ([37, 38, 39, 40, 32].includes(e.keyCode)) {
            e.preventDefault();
        }
    }
    
    /**
     * Handler para tecla solta
     */
    onKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
        this.keys[e.keyCode] = false;
    }
    
    /**
     * Handler para movimento do mouse
     */
    onMouseMove(e) {
        const rect = e.target.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }
    
    /**
     * Handler para clique do mouse
     */
    onMouseDown(e) {
        if (e.button === 0) {
            this.mouse.down = true;
        } else if (e.button === 2) {
            this.mouse.rightDown = true;
        }
    }
    
    /**
     * Handler para soltar botão do mouse
     */
    onMouseUp(e) {
        if (e.button === 0) {
            this.mouse.down = false;
        } else if (e.button === 2) {
            this.mouse.rightDown = false;
        }
    }
    
    /**
     * Handler para scroll do mouse
     */
    onMouseWheel(e) {
        this.mouse.wheel = Math.sign(e.deltaY);
        e.preventDefault();
    }
    
    /**
     * Handler para toque na tela
     */
    onTouchStart(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = e.target.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
            this.mouse.down = true;
        }
        e.preventDefault();
    }
    
    /**
     * Handler para movimento de toque
     */
    onTouchMove(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = e.target.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
        }
        e.preventDefault();
    }
    
    /**
     * Handler para fim do toque
     */
    onTouchEnd(e) {
        this.mouse.down = false;
        e.preventDefault();
    }
    
    /**
     * Verifica se uma tecla está pressionada
     */
    isKeyDown(key) {
        return this.keys[key.toLowerCase()] || this.keys[this.keyCodeFromKey(key)] || false;
    }
    
    /**
     * Obtém código da tecla a partir da string
     */
    keyCodeFromKey(key) {
        const keyMap = {
            'arrowleft': 37,
            'arrowup': 38,
            'arrowright': 39,
            'arrowdown': 40,
            ' ': 32,
            'w': 87,
            'a': 65,
            's': 83,
            'd': 68,
            'r': 82,
            'escape': 27
        };
        
        return keyMap[key.toLowerCase()] || key.toUpperCase().charCodeAt(0);
    }
    
    /**
     * Limpa todos os inputs
     */
    clearAllInputs() {
        this.keys = {};
        this.mouse.down = false;
        this.mouse.rightDown = false;
    }
    
    /**
     * Obtém direção de movimento a partir das teclas
     */
    getMovementDirection() {
        let dx = 0;
        let dy = 0;
        
        if (this.isKeyDown('w') || this.isKeyDown('arrowup')) dy -= 1;
        if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) dy += 1;
        if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) dx -= 1;
        if (this.isKeyDown('d') || this.isKeyDown('arrowright')) dx += 1;
        
        // Normaliza movimento diagonal
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }
        
        return { x: dx, y: dy };
    }
}

// ============================================================================
// CLASSE CAMERA - CONTROLE DE VISUALIZAÇÃO DO MUNDO
// ============================================================================

class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Posição da câmera (centro da tela)
        this.position = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        
        // Configurações
        this.zoom = GameConfig.ZOOM_LEVEL;
        this.minZoom = 0.5;
        this.maxZoom = 3.0;
        this.smoothing = GameConfig.CAMERA_SMOOTHING;
        
        // Limites da câmera (serão ajustados conforme o mundo é gerado)
        this.bounds = {
            minX: -Infinity,
            maxX: Infinity,
            minY: -Infinity,
            maxY: Infinity
        };
        
        // Offset para centralizar na tela
        this.offset = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };
        
        // Estado
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
    }
    
    /**
     * Atualiza a posição da câmera
     */
    update(targetEntity, deltaTime) {
        // Atualiza target para seguir a entidade
        this.target.x = targetEntity.position.x;
        this.target.y = targetEntity.position.y;
        
        // Aplica suavização ao movimento
        this.position.x += (this.target.x - this.position.x) * this.smoothing;
        this.position.y += (this.target.y - this.position.y) * this.smoothing;
        
        // Aplica limites da câmera
        this.applyBounds();
        
        // Atualiza offset para centralizar na tela
        this.offset.x = this.canvas.width / 2;
        this.offset.y = this.canvas.height / 2;
        
        // Processa shake da câmera
        if (this.shakeTimer > 0) {
            this.shakeTimer -= deltaTime;
        }
        
        // Processa zoom com scroll do mouse
        this.handleZoom();
    }
    
    /**
     * Aplica transformações da câmera ao contexto
     */
    applyTransform(context) {
        context.save();
        
        // Move para o centro da tela
        context.translate(this.offset.x, this.offset.y);
        
        // Aplica zoom
        context.scale(this.zoom, this.zoom);
        
        // Move para a posição da câmera (invertido para seguir o mundo)
        context.translate(-this.position.x, -this.position.y);
        
        // Aplica shake se necessário
        if (this.shakeTimer > 0) {
            const shakeX = (Math.random() - 0.5) * this.shakeIntensity * this.shakeTimer;
            const shakeY = (Math.random() - 0.5) * this.shakeIntensity * this.shakeTimer;
            context.translate(shakeX, shakeY);
        }
    }
    
    /**
     * Restaura transformações do contexto
     */
    restoreTransform(context) {
        context.restore();
    }
    
    /**
     * Converte coordenadas da tela para coordenadas do mundo
     */
    screenToWorld(screenX, screenY) {
        const worldX = (screenX - this.offset.x) / this.zoom + this.position.x;
        const worldY = (screenY - this.offset.y) / this.zoom + this.position.y;
        return { x: worldX, y: worldY };
    }
    
    /**
     * Converte coordenadas do mundo para coordenadas da tela
     */
    worldToScreen(worldX, worldY) {
        const screenX = (worldX - this.position.x) * this.zoom + this.offset.x;
        const screenY = (worldY - this.position.y) * this.zoom + this.offset.y;
        return { x: screenX, y: screenY };
    }
    
    /**
     * Verifica se um ponto do mundo está visível na câmera
     */
    isInView(worldX, worldY, margin = 0) {
        const halfWidth = (this.canvas.width / this.zoom) / 2 + margin;
        const halfHeight = (this.canvas.height / this.zoom) / 2 + margin;
        
        return Math.abs(worldX - this.position.x) < halfWidth &&
               Math.abs(worldY - this.position.y) < halfHeight;
    }
    
    /**
     * Aplica shake à câmera
     */
    shake(intensity = 5, duration = 0.3) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }
    
    /**
     * Manipula zoom com scroll do mouse
     */
    handleZoom() {
        // Esta função será chamada pelo InputManager
        // O zoom real é aplicado no applyTransform
    }
    
    /**
     * Aplica zoom na câmera
     */
    applyZoom(delta) {
        const zoomFactor = 0.1;
        const oldZoom = this.zoom;
        
        // Calcula novo zoom
        this.zoom += delta * zoomFactor * this.zoom;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
        
        // Ajusta posição para zoom no mouse
        // (Para uma experiência mais polida, manteremos simples por enquanto)
    }
    
    /**
     * Aplica limites à câmera
     */
    applyBounds() {
        this.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.position.x));
        this.position.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, this.position.y));
    }
    
    /**
     * Define limites para a câmera
     */
    setBounds(minX, maxX, minY, maxY) {
        this.bounds = { minX, maxX, minY, maxY };
    }
    
    /**
     * Lida com redimensionamento do canvas
     */
    handleResize() {
        this.offset.x = this.canvas.width / 2;
        this.offset.y = this.canvas.height / 2;
    }
    
    /**
     * Reseta a câmera para posição inicial
     */
    reset() {
        this.position = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this.zoom = GameConfig.ZOOM_LEVEL;
        this.shakeTimer = 0;
    }
}

// ============================================================================
// CLASSE WORLD - GERENCIAMENTO DO MUNDO INFINITO
// ============================================================================

class World {
    constructor() {
        // Sistema de chunks
        this.chunks = new Map(); // Mapa de chunks por coordenada
        this.loadedChunks = new Set(); // Chunks atualmente carregados
        
        // Geração procedural
        this.noise = new PerlinNoise(GameConfig.WORLD_SEED);
        this.biomeNoise = new PerlinNoise(GameConfig.WORLD_SEED + 1);
        
        // Cache de biomas
        this.biomeCache = new Map();
        
        // Configurações
        this.chunkSize = GameConfig.CHUNK_SIZE;
        this.tileSize = GameConfig.TILE_SIZE;
        this.renderDistance = GameConfig.RENDER_DISTANCE;
        
        // Estatísticas
        this.generatedChunks = 0;
        this.unloadedChunks = 0;
        
        console.log('🌍 Mundo inicializado com seed:', GameConfig.WORLD_SEED);
    }
    
    /**
     * Atualiza o mundo com base na posição do jogador
     */
    update(playerPosition) {
        // Calcula chunk atual do jogador
        const playerChunkX = Math.floor(playerPosition.x / (this.chunkSize * this.tileSize));
        const playerChunkY = Math.floor(playerPosition.y / (this.chunkSize * this.tileSize));
        
        // Determina quais chunks devem estar carregados
        const chunksToLoad = this.getChunksInRadius(playerChunkX, playerChunkY, this.renderDistance);
        
        // Carrega novos chunks
        chunksToLoad.forEach(({ x, y }) => {
            const chunkKey = `${x},${y}`;
            
            if (!this.chunks.has(chunkKey)) {
                this.generateChunk(x, y);
            }
            
            if (!this.loadedChunks.has(chunkKey)) {
                this.loadedChunks.add(chunkKey);
            }
        });
        
        // Descarga de chunks fora do raio de renderização
        this.unloadDistantChunks(playerChunkX, playerChunkY);
    }
    
    /**
     * Gera um novo chunk
     */
    generateChunk(chunkX, chunkY) {
        const chunkKey = `${chunkX},${chunkY}`;
        
        // Verifica se chunk já existe
        if (this.chunks.has(chunkKey)) {
            return this.chunks.get(chunkKey);
        }
        
        console.log(`🔄 Gerando chunk: (${chunkX}, ${chunkY})`);
        
        // Cria novo chunk
        const chunk = {
            x: chunkX,
            y: chunkY,
            tiles: [],
            biome: null,
            entities: [],
            items: [],
            generated: false
        };
        
        // Determina bioma principal do chunk
        chunk.biome = this.determineBiome(chunkX, chunkY);
        
        // Gera tiles do chunk
        this.generateChunkTiles(chunk);
        
        // Marca como gerado
        chunk.generated = true;
        
        // Armazena chunk
        this.chunks.set(chunkKey, chunk);
        this.generatedChunks++;
        
        return chunk;
    }
    
    /**
     * Gera os tiles de um chunk
     */
    generateChunkTiles(chunk) {
        const { x: chunkX, y: chunkY, biome } = chunk;
        const tiles = [];
        
        // Offset do chunk em coordenadas de mundo
        const worldStartX = chunkX * this.chunkSize;
        const worldStartY = chunkY * this.chunkSize;
        
        // Gera cada tile no chunk
        for (let y = 0; y < this.chunkSize; y++) {
            const row = [];
            for (let x = 0; x < this.chunkSize; x++) {
                // Coordenada global do tile
                const worldX = worldStartX + x;
                const worldY = worldStartY + y;
                
                // Gera tile baseado no bioma e ruído
                const tile = this.generateTile(worldX, worldY, biome);
                row.push(tile);
            }
            tiles.push(row);
        }
        
        chunk.tiles = tiles;
    }
    
    /**
     * Determina o bioma para coordenadas do chunk
     */
    determineBiome(chunkX, chunkY) {
        const cacheKey = `${chunkX},${chunkY}`;
        
        // Verifica cache
        if (this.biomeCache.has(cacheKey)) {
            return this.biomeCache.get(cacheKey);
        }
        
        // Usa ruído para determinar bioma
        const noiseValue = this.biomeNoise.get(chunkX * 0.1, chunkY * 0.1);
        
        let biome;
        if (noiseValue < 0.3) {
            biome = 'desert';
        } else if (noiseValue < 0.6) {
            biome = 'grassland';
        } else {
            biome = 'forest';
        }
        
        // Armazena em cache
        this.biomeCache.set(cacheKey, biome);
        
        return biome;
    }
    
    /**
     * Gera um tile individual
     */
    generateTile(worldX, worldY, biome) {
        // Valor de ruído para detalhes do tile
        const detailNoise = this.noise.get(worldX * 0.2, worldY * 0.2);
        
        // Valor de ruído para variação de altura
        const heightNoise = this.noise.get(worldX * 0.05, worldY * 0.05);
        
        let tileType = 'grass'; // Padrão
        
        // Determina tipo de tile baseado no bioma
        switch (biome) {
            case 'grassland':
                tileType = this.generateGrasslandTile(detailNoise, heightNoise);
                break;
            case 'forest':
                tileType = this.generateForestTile(detailNoise, heightNoise);
                break;
            case 'desert':
                tileType = this.generateDesertTile(detailNoise, heightNoise);
                break;
        }
        
        return {
            type: tileType,
            biome: biome,
            walkable: this.isTileWalkable(tileType),
            height: heightNoise,
            variation: Math.floor(detailNoise * 4) // 0-3 variações
        };
    }
    
    /**
     * Gera tile para bioma de grassland
     */
    generateGrasslandTile(detailNoise, heightNoise) {
        if (heightNoise > 0.7) {
            return 'mountain';
        } else if (heightNoise > 0.6) {
            return 'hill';
        } else if (detailNoise < 0.2) {
            return 'water';
        } else if (detailNoise < 0.3) {
            return 'flower';
        } else {
            return 'grass';
        }
    }
    
    /**
     * Gera tile para bioma de forest
     */
    generateForestTile(detailNoise, heightNoise) {
        if (heightNoise > 0.7) {
            return 'mountain';
        } else if (detailNoise < 0.3) {
            return 'tree';
        } else if (detailNoise < 0.4) {
            return 'rock';
        } else {
            return 'grass';
        }
    }
    
    /**
     * Gera tile para bioma de deserto
     */
    generateDesertTile(detailNoise, heightNoise) {
        if (heightNoise > 0.8) {
            return 'mountain';
        } else if (detailNoise < 0.2) {
            return 'cactus';
        } else if (detailNoise < 0.3) {
            return 'rock';
        } else {
            return 'sand';
        }
    }
    
    /**
     * Verifica se um tile é transitável
     */
    isTileWalkable(tileType) {
        const unwalkableTiles = ['mountain', 'water', 'tree', 'cactus'];
        return !unwalkableTiles.includes(tileType);
    }
    
    /**
     * Obtém chunks dentro de um raio
     */
    getChunksInRadius(centerX, centerY, radius) {
        const chunks = [];
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                chunks.push({ x, y });
            }
        }
        
        return chunks;
    }
    
    /**
     * Descarrega chunks distantes
     */
    unloadDistantChunks(playerChunkX, playerChunkY) {
        const chunksToUnload = [];
        
        this.loadedChunks.forEach(chunkKey => {
            const [x, y] = chunkKey.split(',').map(Number);
            const distance = Math.max(Math.abs(x - playerChunkX), Math.abs(y - playerChunkY));
            
            if (distance > this.renderDistance) {
                chunksToUnload.push(chunkKey);
            }
        });
        
        // Remove chunks da lista de carregados
        chunksToUnload.forEach(chunkKey => {
            this.loadedChunks.delete(chunkKey);
            this.unloadedChunks++;
        });
    }
    
    /**
     * Renderiza o mundo visível
     */
    render(context, camera) {
        // Itera sobre chunks carregados
        this.loadedChunks.forEach(chunkKey => {
            const chunk = this.chunks.get(chunkKey);
            
            if (chunk && chunk.generated) {
                this.renderChunk(context, chunk, camera);
            }
        });
    }
    
    /**
     * Renderiza um chunk individual
     */
    renderChunk(context, chunk, camera) {
        const { x: chunkX, y: chunkY, tiles, biome } = chunk;
        
        // Offset do chunk em coordenadas de mundo
        const worldStartX = chunkX * this.chunkSize * this.tileSize;
        const worldStartY = chunkY * this.chunkSize * this.tileSize;
        
        // Verifica se o chunk está na visão da câmera
        const chunkCenterX = worldStartX + (this.chunkSize * this.tileSize) / 2;
        const chunkCenterY = worldStartY + (this.chunkSize * this.tileSize) / 2;
        
        if (!camera.isInView(chunkCenterX, chunkCenterY, this.chunkSize * this.tileSize)) {
            return; // Não renderiza chunks fora da visão
        }
        
        // Renderiza cada tile visível
        for (let y = 0; y < this.chunkSize; y++) {
            for (let x = 0; x < this.chunkSize; x++) {
                const tile = tiles[y][x];
                const tileX = worldStartX + x * this.tileSize;
                const tileY = worldStartY + y * this.tileSize;
                
                // Verifica se o tile está na visão da câmera
                if (camera.isInView(tileX + this.tileSize/2, tileY + this.tileSize/2, this.tileSize)) {
                    this.renderTile(context, tile, tileX, tileY);
                }
            }
        }
        
        // Debug: mostra borda do chunk
        if (GameConfig.DEBUG_CHUNKS) {
            context.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            context.lineWidth = 1;
            context.strokeRect(worldStartX, worldStartY, 
                             this.chunkSize * this.tileSize, 
                             this.chunkSize * this.tileSize);
            
            // Mostra coordenadas do chunk
            context.fillStyle = 'rgba(255, 255, 255, 0.5)';
            context.font = '10px monospace';
            context.fillText(`(${chunkX},${chunkY})`, 
                           worldStartX + 5, 
                           worldStartY + 15);
            context.fillText(biome, 
                           worldStartX + 5, 
                           worldStartY + 30);
        }
    }
    
    /**
     * Renderiza um tile individual
     */
    renderTile(context, tile, x, y) {
        // Por enquanto, usa cores sólidas baseadas no tipo
        // Na próxima parte, substituiremos por sprites
        
        switch (tile.type) {
            case 'grass':
                context.fillStyle = '#32cd32';
                break;
            case 'flower':
                context.fillStyle = '#ff69b4';
                break;
            case 'water':
                context.fillStyle = '#1e90ff';
                break;
            case 'mountain':
                context.fillStyle = '#8b4513';
                break;
            case 'hill':
                context.fillStyle = '#a0522d';
                break;
            case 'tree':
                context.fillStyle = '#006400';
                break;
            case 'rock':
                context.fillStyle = '#808080';
                break;
            case 'sand':
                context.fillStyle = '#f4a460';
                break;
            case 'cactus':
                context.fillStyle = '#228b22';
                break;
            default:
                context.fillStyle = '#000000';
        }
        
        context.fillRect(x, y, this.tileSize, this.tileSize);
        
        // Adiciona algum detalhe baseado na variação
        if (tile.variation > 0) {
            context.fillStyle = `rgba(0, 0, 0, ${0.1 * tile.variation})`;
            context.fillRect(x, y, this.tileSize, this.tileSize);
        }
        
        // Adiciona altura visualmente
        if (tile.height > 0.5) {
            const heightAlpha = (tile.height - 0.5) * 0.5;
            context.fillStyle = `rgba(255, 255, 255, ${heightAlpha})`;
            context.fillRect(x, y, this.tileSize, this.tileSize);
        }
    }
    
    /**
     * Obtém chunk em coordenadas específicas
     */
    getChunkAt(worldX, worldY) {
        const chunkX = Math.floor(worldX / (this.chunkSize * this.tileSize));
        const chunkY = Math.floor(worldY / (this.chunkSize * this.tileSize));
        const chunkKey = `${chunkX},${chunkY}`;
        
        return this.chunks.get(chunkKey);
    }
    
    /**
     * Obtém tile em coordenadas específicas
     */
    getTileAt(worldX, worldY) {
        const chunk = this.getChunkAt(worldX, worldY);
        
        if (!chunk || !chunk.generated) {
            return null;
        }
        
        const localX = Math.floor((worldX % (this.chunkSize * this.tileSize)) / this.tileSize);
        const localY = Math.floor((worldY % (this.chunkSize * this.tileSize)) / this.tileSize);
        
        // Garante que as coordenadas locais estão dentro dos limites
        if (localX >= 0 && localX < this.chunkSize && 
            localY >= 0 && localY < this.chunkSize) {
            return chunk.tiles[localY][localX];
        }
        
        return null;
    }
}

// ============================================================================
// CLASSE PLAYER - ENTIDADE DO JOGADOR
// ============================================================================

class Player {
    constructor() {
        // Posição e movimento
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.speed = 200; // pixels por segundo
        
        // Estado
        this.isMoving = false;
        this.direction = { x: 0, y: 1 }; // Direção atual (para animações)
        
        // Propriedades visuais
        this.color = '#ff0000';
        this.size = GameConfig.TILE_SIZE * 0.8;
        
        // Status (será expandido)
        this.health = 100;
        this.maxHealth = 100;
        this.level = 1;
        this.experience = 0;
    }
    
    /**
     * Atualiza estado do jogador
     */
    update(deltaTime, inputManager) {
        // Obtém direção do input
        const direction = inputManager.getMovementDirection();
        this.isMoving = direction.x !== 0 || direction.y !== 0;
        
        // Atualiza direção
        if (this.isMoving) {
            this.direction = direction;
        }
        
        // Calcula velocidade
        this.velocity.x = direction.x * this.speed;
        this.velocity.y = direction.y * this.speed;
        
        // Atualiza posição
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Verifica colisões (implementaremos na próxima parte)
        // this.checkCollisions();
        
        // Processa inputs especiais
        this.processSpecialInputs(inputManager);
    }
    
    /**
     * Processa inputs especiais
     */
    processSpecialInputs(inputManager) {
        // Resetar câmera
        if (inputManager.isKeyDown('r')) {
            // Será implementado na parte da câmera
        }
    }
    
    /**
     * Renderiza o jogador
     */
    render(context) {
        context.save();
        
        // Posiciona no centro do tile
        const renderX = this.position.x - this.size / 2;
        const renderY = this.position.y - this.size / 2;
        
        // Corpo do jogador
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(this.position.x, this.position.y, this.size / 2, 0, Math.PI * 2);
        context.fill();
        
        // Olhos (indicam direção)
        const eyeOffset = this.size * 0.3;
        const eyeSize = this.size * 0.15;
        
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(
            this.position.x + this.direction.x * eyeOffset,
            this.position.y + this.direction.y * eyeOffset,
            eyeSize, 0, Math.PI * 2
        );
        context.fill();
        
        // Contorno
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.stroke();
        
        // Nome/Level (placeholder)
        context.fillStyle = '#ffffff';
        context.font = '10px Arial';
        context.textAlign = 'center';
        context.fillText(`Player Lv${this.level}`, this.position.x, this.position.y - this.size);
        
        context.restore();
    }
}

// ============================================================================
// CLASSE PERLIN NOISE - GERADOR DE RUIDO PARA MUNDO PROCEDURAL
// ============================================================================

class PerlinNoise {
    constructor(seed = GameConfig.WORLD_SEED) {
        this.seed = seed;
        this.gradients = new Map();
        this.memory = new Map();
        
        // Inicializa gerador de números aleatórios com seed
        this.random = this.seededRandom(seed);
        
        // Preenche gradientes
        this.generateGradients();
    }
    
    /**
     * Gera gradientes para o algoritmo de Perlin
     */
    generateGradients() {
        // Para simplificar, usaremos uma abordagem mais direta
        // Em produção, implementaríamos o algoritmo clássico de Perlin
    }
    
    /**
     * Gerador de números aleatórios com seed
     */
    seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    /**
     * Função de hash para coordenadas
     */
    hash(x, y) {
        const key = `${x},${y}`;
        if (this.memory.has(key)) {
            return this.memory.get(key);
        }
        
        // Usa o gerador de números aleatórios com seed
        const value = this.random();
        this.memory.set(key, value);
        return value;
    }
    
    /**
     * Interpolação suave
     */
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    /**
     * Interpolação linear
     */
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    /**
     * Obtém valor de ruído para coordenadas
     */
    get(x, y) {
        // Coordenadas da grade
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        
        // Posição relativa dentro da célula
        const xf = x - xi;
        const yf = y - yi;
        
        // Valores de ruído nos cantos
        const n00 = this.hash(xi, yi);
        const n10 = this.hash(xi + 1, yi);
        const n01 = this.hash(xi, yi + 1);
        const n11 = this.hash(xi + 1, yi + 1);
        
        // Interpolação
        const u = this.fade(xf);
        const v = this.fade(yf);
        
        const nx0 = this.lerp(n00, n10, u);
        const nx1 = this.lerp(n01, n11, u);
        
        return this.lerp(nx0, nx1, v);
    }
    
    /**
     * Obtém ruído com múltiplas octaves (fractal noise)
     */
    getFractal(x, y, octaves = 4, persistence = 0.5) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += this.get(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return value / maxValue;
    }
}

// ============================================================================
// INICIALIZAÇÃO E EXPOSIÇÃO GLOBAL
// ============================================================================

// Variável global para acesso ao motor do jogo
window.GameEngine = GameEngine;

// Flag de debug
GameConfig.DEBUG_CHUNKS = false;

// Inicializa o jogo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Infinite RPG - Inicializando...');
    
    // Cria instância do motor
    const game = new GameEngine();
    
    // Expõe para console para debugging
    window.game = game;
    
    // Configuração de debug
    window.toggleDebug = () => {
        GameConfig.DEBUG_CHUNKS = !GameConfig.DEBUG_CHUNKS;
        console.log(`Debug chunks: ${GameConfig.DEBUG_CHUNKS}`);
    };
    
    console.log('🎮 Jogo pronto! Use window.game para debugging.');
    console.log('📝 Comandos disponíveis:');
    console.log('  - window.toggleDebug() - Alterna visualização de chunks');
    console.log('  - game.stop() - Para o game loop');
    console.log('  - game.start() - Retoma o game loop');
});

// Exporta classes para uso em módulos futuros
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GameEngine,
        InputManager,
        Camera,
        World,
        Player,
        PerlinNoise,
        GameConfig
    };
}window.Game = Game; // Ou o nome da variável principal que a IA usou
