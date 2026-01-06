/**
 * INFINITE RPG - PARTE 2: SISTEMA DE ENTIDADES E COLISÕES
 * 
 * Esta parte implementa:
 * 1. Classe base Entity com sistema de componentes
 * 2. EntityManager para gerenciamento de todas as entidades
 * 3. Sistema de colisão AABB e por círculos
 * 4. Movimento com detecção de obstáculos
 * 5. Classes específicas para Player, NPCs e Criaturas
 */

// ============================================================================
// SISTEMA DE COMPONENTES - ARQUITETURA DATA-ORIENTED
// ============================================================================

/**
 * Componente base - Todos os componentes herdam desta classe
 */
class Component {
    constructor(entity, config = {}) {
        this.entity = entity;
        this.enabled = true;
        this.type = this.constructor.name;
        
        // Método de inicialização que pode ser sobrescrito
        this.initialize(config);
    }
    
    initialize(config) {
        // Configuração básica do componente
        Object.assign(this, config);
    }
    
    update(deltaTime) {
        // A ser sobrescrito por componentes específicos
    }
    
    render(context) {
        // A ser sobrescrito por componentes específicos
    }
    
    onCollision(otherEntity, collisionData) {
        // Chamado quando ocorre uma colisão
    }
    
    destroy() {
        // Limpeza do componente
        this.enabled = false;
    }
}

/**
 * Componente Transform - Gerencia posição, rotação e escala
 */
class TransformComponent extends Component {
    initialize(config) {
        this.position = config.position || { x: 0, y: 0 };
        this.velocity = config.velocity || { x: 0, y: 0 };
        this.rotation = config.rotation || 0;
        this.scale = config.scale || { x: 1, y: 1 };
        this.previousPosition = { ...this.position };
        
        // Para interpolação de renderização
        this.renderPosition = { ...this.position };
    }
    
    update(deltaTime) {
        // Salva posição anterior para colisão
        this.previousPosition.x = this.position.x;
        this.previousPosition.y = this.position.y;
        
        // Atualiza posição baseada na velocidade
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Interpola posição para renderização suave
        const alpha = 0.2; // Fator de interpolação
        this.renderPosition.x += (this.position.x - this.renderPosition.x) * alpha;
        this.renderPosition.y += (this.position.y - this.renderPosition.y) * alpha;
    }
    
    move(x, y) {
        this.position.x += x;
        this.position.y += y;
    }
    
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        this.renderPosition.x = x;
        this.renderPosition.y = y;
    }
    
    getDirection() {
        return {
            x: Math.cos(this.rotation),
            y: Math.sin(this.rotation)
        };
    }
    
    distanceTo(otherTransform) {
        const dx = this.position.x - otherTransform.position.x;
        const dy = this.position.y - otherTransform.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

/**
 * Componente Collider - Define formas de colisão
 */
class ColliderComponent extends Component {
    initialize(config) {
        this.type = config.type || 'circle'; // 'circle', 'aabb', 'none'
        this.radius = config.radius || 16;
        this.width = config.width || 32;
        this.height = config.height || 32;
        this.offset = config.offset || { x: 0, y: 0 };
        this.isTrigger = config.isTrigger || false;
        this.collisionLayer = config.collisionLayer || 'default';
        this.collidesWith = config.collidesWith || ['default'];
        
        // Estados de colisão
        this.isColliding = false;
        this.collisions = new Set();
    }
    
    getBounds() {
        const transform = this.entity.getComponent('TransformComponent');
        if (!transform) return null;
        
        if (this.type === 'circle') {
            return {
                type: 'circle',
                x: transform.position.x + this.offset.x,
                y: transform.position.y + this.offset.y,
                radius: this.radius
            };
        } else if (this.type === 'aabb') {
            return {
                type: 'aabb',
                x: transform.position.x + this.offset.x - this.width / 2,
                y: transform.position.y + this.offset.y - this.height / 2,
                width: this.width,
                height: this.height
            };
        }
        
        return null;
    }
    
    getRenderBounds() {
        const transform = this.entity.getComponent('TransformComponent');
        if (!transform) return null;
        
        if (this.type === 'circle') {
            return {
                type: 'circle',
                x: transform.renderPosition.x + this.offset.x,
                y: transform.renderPosition.y + this.offset.y,
                radius: this.radius
            };
        } else if (this.type === 'aabb') {
            return {
                type: 'aabb',
                x: transform.renderPosition.x + this.offset.x - this.width / 2,
                y: transform.renderPosition.y + this.offset.y - this.height / 2,
                width: this.width,
                height: this.height
            };
        }
        
        return null;
    }
    
    checkCollision(otherCollider) {
        const boundsA = this.getBounds();
        const boundsB = otherCollider.getBounds();
        
        if (!boundsA || !boundsB) return null;
        
        // Colisão círculo-círculo
        if (boundsA.type === 'circle' && boundsB.type === 'circle') {
            return this.checkCircleCircle(boundsA, boundsB);
        }
        
        // Colisão AABB-AABB
        if (boundsA.type === 'aabb' && boundsB.type === 'aabb') {
            return this.checkAABBAABB(boundsA, boundsB);
        }
        
        // Colisão círculo-AABB (simplificada)
        if ((boundsA.type === 'circle' && boundsB.type === 'aabb') ||
            (boundsA.type === 'aabb' && boundsB.type === 'circle')) {
            return boundsA.type === 'circle' 
                ? this.checkCircleAABB(boundsA, boundsB)
                : this.checkCircleAABB(boundsB, boundsA);
        }
        
        return null;
    }
    
    checkCircleCircle(circleA, circleB) {
        const dx = circleA.x - circleB.x;
        const dy = circleA.y - circleB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = circleA.radius + circleB.radius;
        
        if (distance < minDistance) {
            return {
                collides: true,
                penetration: minDistance - distance,
                normal: {
                    x: dx / distance,
                    y: dy / distance
                },
                contact: {
                    x: (circleA.x + circleB.x) / 2,
                    y: (circleA.y + circleB.y) / 2
                }
            };
        }
        
        return null;
    }
    
    checkAABBAABB(boxA, boxB) {
        const leftA = boxA.x;
        const rightA = boxA.x + boxA.width;
        const topA = boxA.y;
        const bottomA = boxA.y + boxA.height;
        
        const leftB = boxB.x;
        const rightB = boxB.x + boxB.width;
        const topB = boxB.y;
        const bottomB = boxB.y + boxB.height;
        
        if (rightA < leftB || leftA > rightB || bottomA < topB || topA > bottomB) {
            return null;
        }
        
        // Calcula penetração
        const penetrationX = Math.min(rightA - leftB, rightB - leftA);
        const penetrationY = Math.min(bottomA - topB, bottomB - topA);
        
        // Determina a menor penetração
        let normal, penetration;
        if (penetrationX < penetrationY) {
            normal = { x: (leftB < leftA) ? 1 : -1, y: 0 };
            penetration = penetrationX;
        } else {
            normal = { x: 0, y: (topB < topA) ? 1 : -1 };
            penetration = penetrationY;
        }
        
        return {
            collides: true,
            penetration: penetration,
            normal: normal,
            contact: {
                x: (Math.max(leftA, leftB) + Math.min(rightA, rightB)) / 2,
                y: (Math.max(topA, topB) + Math.min(bottomA, bottomB)) / 2
            }
        };
    }
    
    checkCircleAABB(circle, box) {
        // Encontra o ponto mais próximo no AABB ao círculo
        let closestX = Math.max(box.x, Math.min(circle.x, box.x + box.width));
        let closestY = Math.max(box.y, Math.min(circle.y, box.y + box.height));
        
        // Calcula a distância entre o centro do círculo e este ponto mais próximo
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        // Se a distância é menor que o raio, há colisão
        if (distanceSquared < circle.radius * circle.radius) {
            const distance = Math.sqrt(distanceSquared);
            
            return {
                collides: true,
                penetration: circle.radius - distance,
                normal: {
                    x: distanceX / distance,
                    y: distanceY / distance
                },
                contact: {
                    x: closestX,
                    y: closestY
                }
            };
        }
        
        return null;
    }
    
    render(context) {
        if (!GameConfig.DEBUG_COLLIDERS) return;
        
        const bounds = this.getRenderBounds();
        if (!bounds) return;
        
        context.save();
        
        if (this.isColliding) {
            context.strokeStyle = '#ff0000';
            context.fillStyle = 'rgba(255, 0, 0, 0.1)';
        } else {
            context.strokeStyle = '#00ff00';
            context.fillStyle = 'rgba(0, 255, 0, 0.1)';
        }
        
        context.lineWidth = 1;
        
        if (bounds.type === 'circle') {
            context.beginPath();
            context.arc(bounds.x, bounds.y, bounds.radius, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            
            // Centro
            context.fillStyle = '#ffff00';
            context.fillRect(bounds.x - 2, bounds.y - 2, 4, 4);
        } else if (bounds.type === 'aabb') {
            context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
            context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            
            // Centro
            context.fillStyle = '#ffff00';
            context.fillRect(
                bounds.x + bounds.width / 2 - 2,
                bounds.y + bounds.height / 2 - 2,
                4, 4
            );
        }
        
        // Layer info
        context.fillStyle = '#ffffff';
        context.font = '8px monospace';
        context.fillText(
            this.collisionLayer,
            bounds.x + (bounds.width || bounds.radius * 2) / 2 - 15,
            bounds.y - 10
        );
        
        context.restore();
    }
}

/**
 * Componente Physics - Responsável por movimento e física
 */
class PhysicsComponent extends Component {
    initialize(config) {
        this.speed = config.speed || 100;
        this.maxSpeed = config.maxSpeed || 200;
        this.acceleration = config.acceleration || 400;
        this.friction = config.friction || 0.9;
        this.mass = config.mass || 1;
        this.gravity = config.gravity || 0;
        this.grounded = false;
        this.canJump = false;
        
        this.movementInput = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.externalForces = []; // Forças aplicadas externamente
    }
    
    update(deltaTime) {
        const transform = this.entity.getComponent('TransformComponent');
        if (!transform) return;
        
        // Aplica gravidade
        this.velocity.y += this.gravity * deltaTime;
        
        // Calcula velocidade alvo baseada no input
        const targetVelocity = {
            x: this.movementInput.x * this.speed,
            y: this.movementInput.y * this.speed
        };
        
        // Interpola para a velocidade alvo
        this.velocity.x += (targetVelocity.x - this.velocity.x) * this.acceleration * deltaTime;
        this.velocity.y += (targetVelocity.y - this.velocity.y) * this.acceleration * deltaTime;
        
        // Aplica forças externas
        this.applyExternalForces(deltaTime);
        
        // Limita velocidade máxima
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (currentSpeed > this.maxSpeed) {
            const ratio = this.maxSpeed / currentSpeed;
            this.velocity.x *= ratio;
            this.velocity.y *= ratio;
        }
        
        // Aplica fricção quando não há input
        if (Math.abs(this.movementInput.x) < 0.1) {
            this.velocity.x *= this.friction;
        }
        if (Math.abs(this.movementInput.y) < 0.1) {
            this.velocity.y *= this.friction;
        }
        
        // Remove velocidades muito pequenas
        if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
        
        // Atualiza transform
        transform.velocity.x = this.velocity.x;
        transform.velocity.y = this.velocity.y;
    }
    
    applyExternalForces(deltaTime) {
        for (let i = this.externalForces.length - 1; i >= 0; i--) {
            const force = this.externalForces[i];
            
            this.velocity.x += force.x * deltaTime / this.mass;
            this.velocity.y += force.y * deltaTime / this.mass;
            
            force.duration -= deltaTime;
            if (force.duration <= 0) {
                this.externalForces.splice(i, 1);
            }
        }
    }
    
    applyForce(forceX, forceY, duration = 0.1) {
        this.externalForces.push({
            x: forceX,
            y: forceY,
            duration: duration
        });
    }
    
    setMovementInput(x, y) {
        this.movementInput.x = x;
        this.movementInput.y = y;
    }
    
    stop() {
        this.movementInput.x = 0;
        this.movementInput.y = 0;
        this.velocity.x = 0;
        this.velocity.y = 0;
    }
    
    jump(force = 300) {
        if (this.canJump) {
            this.applyForce(0, -force, 0.2);
            this.canJump = false;
            this.grounded = false;
            return true;
        }
        return false;
    }
}

/**
 * Componente Render - Responsável pela renderização visual
 */
class RenderComponent extends Component {
    initialize(config) {
        this.color = config.color || '#ff0000';
        this.sprite = config.sprite || null;
        this.spriteSheet = config.spriteSheet || null;
        this.width = config.width || 32;
        this.height = config.height || 32;
        this.offset = config.offset || { x: 0, y: 0 };
        this.opacity = config.opacity || 1;
        this.blendMode = config.blendMode || 'source-over';
        
        // Animação
        this.currentAnimation = null;
        this.animations = new Map();
        this.frame = 0;
        this.frameTimer = 0;
        this.frameDuration = 100; // ms por frame
        
        // Estado de renderização
        this.visible = true;
        this.debug = false;
    }
    
    update(deltaTime) {
        // Atualiza animação
        if (this.currentAnimation && this.spriteSheet) {
            this.frameTimer += deltaTime * 1000; // Converte para ms
            
            if (this.frameTimer >= this.frameDuration) {
                this.frameTimer = 0;
                this.frame = (this.frame + 1) % this.currentAnimation.frames.length;
            }
        }
    }
    
    render(context) {
        if (!this.visible) return;
        
        const transform = this.entity.getComponent('TransformComponent');
        if (!transform) return;
        
        context.save();
        
        // Aplica opacidade e blend mode
        context.globalAlpha = this.opacity;
        context.globalCompositeOperation = this.blendMode;
        
        // Posição de renderização com offset
        const renderX = transform.renderPosition.x + this.offset.x - this.width / 2;
        const renderY = transform.renderPosition.y + this.offset.y - this.height / 2;
        
        if (this.sprite) {
            // Renderiza sprite único
            if (this.sprite.complete) {
                context.drawImage(
                    this.sprite,
                    renderX,
                    renderY,
                    this.width,
                    this.height
                );
            }
        } else if (this.spriteSheet && this.currentAnimation) {
            // Renderiza frame da spritesheet
            const frame = this.currentAnimation.frames[this.frame];
            context.drawImage(
                this.spriteSheet,
                frame.x, frame.y, frame.width, frame.height,
                renderX, renderY, this.width, this.height
            );
        } else {
            // Renderização padrão (círculo colorido)
            context.fillStyle = this.color;
            context.beginPath();
            context.arc(
                transform.renderPosition.x + this.offset.x,
                transform.renderPosition.y + this.offset.y,
                this.width / 2,
                0,
                Math.PI * 2
            );
            context.fill();
            
            // Contorno
            context.strokeStyle = '#000000';
            context.lineWidth = 1;
            context.stroke();
        }
        
        // Debug info
        if (this.debug || GameConfig.DEBUG_ENTITIES) {
            context.strokeStyle = '#ffff00';
            context.lineWidth = 1;
            context.strokeRect(renderX, renderY, this.width, this.height);
            
            // Nome da entidade
            context.fillStyle = '#ffffff';
            context.font = '10px monospace';
            context.fillText(
                this.entity.name || this.entity.id.substring(0, 8),
                renderX,
                renderY - 10
            );
        }
        
        context.restore();
    }
    
    addAnimation(name, frames) {
        this.animations.set(name, {
            name: name,
            frames: frames,
            loop: true
        });
    }
    
    playAnimation(name, forceReset = false) {
        const animation = this.animations.get(name);
        if (!animation) return;
        
        if (this.currentAnimation !== animation || forceReset) {
            this.currentAnimation = animation;
            this.frame = 0;
            this.frameTimer = 0;
        }
    }
}

/**
 * Componente AI - Inteligência artificial para NPCs e criaturas
 */
class AIComponent extends Component {
    initialize(config) {
        this.behavior = config.behavior || 'idle';
        this.state = config.state || 'idle';
        this.target = config.target || null;
        this.aggroRange = config.aggroRange || 150;
        this.attackRange = config.attackRange || 50;
        this.sightRange = config.sightRange || 200;
        this.patrolPoints = config.patrolPoints || [];
        this.currentPatrolIndex = 0;
        
        // Timers
        this.stateTimer = 0;
        this.idleDuration = config.idleDuration || 2;
        this.patrolSpeed = config.patrolSpeed || 50;
        
        // Memória
        this.lastKnownPlayerPosition = null;
        this.memory = new Map();
    }
    
    update(deltaTime) {
        this.stateTimer += deltaTime;
        
        switch (this.behavior) {
            case 'passive':
                this.updatePassive(deltaTime);
                break;
            case 'patrol':
                this.updatePatrol(deltaTime);
                break;
            case 'aggressive':
                this.updateAggressive(deltaTime);
                break;
            case 'friendly':
                this.updateFriendly(deltaTime);
                break;
            default:
                this.updateIdle(deltaTime);
        }
    }
    
    updateIdle(deltaTime) {
        if (this.state === 'idle') {
            if (this.stateTimer >= this.idleDuration) {
                this.setState('wander');
                this.stateTimer = 0;
            }
        } else if (this.state === 'wander') {
            // Movimento aleatório simples
            const physics = this.entity.getComponent('PhysicsComponent');
            if (physics) {
                if (this.stateTimer < 1) {
                    physics.setMovementInput(
                        Math.cos(this.stateTimer * Math.PI * 2) * 0.5,
                        Math.sin(this.stateTimer * Math.PI * 2) * 0.5
                    );
                } else {
                    physics.setMovementInput(0, 0);
                    this.setState('idle');
                    this.stateTimer = 0;
                }
            }
        }
    }
    
    updatePatrol(deltaTime) {
        if (this.patrolPoints.length === 0) {
            this.updateIdle(deltaTime);
            return;
        }
        
        const currentPoint = this.patrolPoints[this.currentPatrolIndex];
        const transform = this.entity.getComponent('TransformComponent');
        const physics = this.entity.getComponent('PhysicsComponent');
        
        if (!transform || !physics) return;
        
        const dx = currentPoint.x - transform.position.x;
        const dy = currentPoint.y - transform.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 10) {
            // Chegou ao ponto de patrulha
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
            this.stateTimer = 0;
            physics.setMovementInput(0, 0);
        } else {
            // Move em direção ao ponto
            const directionX = dx / distance;
            const directionY = dy / distance;
            physics.setMovementInput(directionX, directionY);
        }
    }
    
    updateAggressive(deltaTime) {
        // Implementação básica de comportamento agressivo
        // Em produção, isso seria mais complexo
        
        if (!this.target) {
            // Procura por jogadores próximos
            const player = EntityManager.getInstance().getPlayer();
            if (player) {
                const transform = this.entity.getComponent('TransformComponent');
                const playerTransform = player.getComponent('TransformComponent');
                
                if (transform && playerTransform) {
                    const distance = transform.distanceTo(playerTransform);
                    if (distance < this.sightRange) {
                        this.target = player;
                        this.setState('chase');
                    }
                }
            }
            return;
        }
        
        if (this.state === 'chase') {
            const transform = this.entity.getComponent('TransformComponent');
            const targetTransform = this.target.getComponent('TransformComponent');
            const physics = this.entity.getComponent('PhysicsComponent');
            
            if (!transform || !targetTransform || !physics) return;
            
            const dx = targetTransform.position.x - transform.position.x;
            const dy = targetTransform.position.y - transform.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.attackRange) {
                this.setState('attack');
            } else if (distance > this.sightRange) {
                this.target = null;
                this.setState('idle');
            } else {
                const directionX = dx / distance;
                const directionY = dy / distance;
                physics.setMovementInput(directionX, directionY);
            }
        } else if (this.state === 'attack') {
            // Lógica de ataque será implementada na parte de combate
            this.stateTimer += deltaTime;
            
            if (this.stateTimer >= 1) {
                this.setState('chase');
                this.stateTimer = 0;
            }
        }
    }
    
    updatePassive(deltaTime) {
        // Comportamento passivo: foge do jogador
        const player = EntityManager.getInstance().getPlayer();
        if (!player) return;
        
        const transform = this.entity.getComponent('TransformComponent');
        const playerTransform = player.getComponent('TransformComponent');
        const physics = this.entity.getComponent('PhysicsComponent');
        
        if (!transform || !playerTransform || !physics) return;
        
        const dx = transform.position.x - playerTransform.position.x;
        const dy = transform.position.y - playerTransform.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.aggroRange) {
            // Foge do jogador
            const directionX = dx / distance;
            const directionY = dy / distance;
            physics.setMovementInput(directionX, directionY);
        } else {
            physics.setMovementInput(0, 0);
        }
    }
    
    updateFriendly(deltaTime) {
        // Comportamento amigável: segue o jogador à distância
        const player = EntityManager.getInstance().getPlayer();
        if (!player) return;
        
        const transform = this.entity.getComponent('TransformComponent');
        const playerTransform = player.getComponent('TransformComponent');
        const physics = this.entity.getComponent('PhysicsComponent');
        
        if (!transform || !playerTransform || !physics) return;
        
        const dx = playerTransform.position.x - transform.position.x;
        const dy = playerTransform.position.y - transform.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 100) {
            // Segue o jogador se estiver muito longe
            const directionX = dx / distance;
            const directionY = dy / distance;
            physics.setMovementInput(directionX, directionY);
        } else if (distance < 50) {
            // Afasta-se se estiver muito perto
            const directionX = -dx / distance * 0.5;
            const directionY = -dy / distance * 0.5;
            physics.setMovementInput(directionX, directionY);
        } else {
            physics.setMovementInput(0, 0);
        }
    }
    
    setState(newState) {
        this.state = newState;
        this.stateTimer = 0;
        
        // Notifica outros componentes da mudança de estado
        this.entity.onStateChange?.(newState);
    }
}

// ============================================================================
// CLASSE ENTITY BASE
// ============================================================================

class Entity {
    constructor(id, name = 'Entity') {
        this.id = id || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = name;
        this.type = 'entity';
        this.active = true;
        this.components = new Map();
        this.tags = new Set();
        
        // Adiciona tag padrão
        this.addTag('entity');
    }
    
    /**
     * Adiciona um componente à entidade
     */
    addComponent(componentType, config = {}) {
        const component = new componentType(this, config);
        this.components.set(component.type, component);
        return component;
    }
    
    /**
     * Obtém um componente específico
     */
    getComponent(componentType) {
        return this.components.get(componentType);
    }
    
    /**
     * Verifica se possui um componente
     */
    hasComponent(componentType) {
        return this.components.has(componentType);
    }
    
    /**
     * Remove um componente
     */
    removeComponent(componentType) {
        const component = this.components.get(componentType);
        if (component) {
            component.destroy();
            this.components.delete(componentType);
        }
    }
    
    /**
     * Adiciona uma tag
     */
    addTag(tag) {
        this.tags.add(tag);
    }
    
    /**
     * Remove uma tag
     */
    removeTag(tag) {
        this.tags.delete(tag);
    }
    
    /**
     * Verifica se possui uma tag
     */
    hasTag(tag) {
        return this.tags.has(tag);
    }
    
    /**
     * Atualiza todos os componentes
     */
    update(deltaTime) {
        if (!this.active) return;
        
        for (const component of this.components.values()) {
            if (component.enabled) {
                component.update(deltaTime);
            }
        }
    }
    
    /**
     * Renderiza todos os componentes de renderização
     */
    render(context) {
        if (!this.active) return;
        
        // Render componentes na ordem correta
        const renderOrder = [
            'RenderComponent',
            'ColliderComponent'
        ];
        
        for (const componentType of renderOrder) {
            const component = this.components.get(componentType);
            if (component && component.enabled) {
                component.render(context);
            }
        }
    }
    
    /**
     * Chamado quando ocorre uma colisão
     */
    onCollision(otherEntity, collisionData) {
        for (const component of this.components.values()) {
            if (component.enabled && component.onCollision) {
                component.onCollision(otherEntity, collisionData);
            }
        }
    }
    
    /**
     * Destroi a entidade
     */
    destroy() {
        // Destroi todos os componentes
        for (const component of this.components.values()) {
            component.destroy();
        }
        
        this.components.clear();
        this.tags.clear();
        this.active = false;
    }
    
    /**
     * Clona a entidade
     */
    clone() {
        const clone = new Entity(null, this.name);
        clone.type = this.type;
        clone.tags = new Set(this.tags);
        
        // Clona componentes
        for (const [type, component] of this.components) {
            // Isso precisa ser implementado por cada componente
            // Para simplificar, apenas copiamos a referência
            clone.components.set(type, component);
        }
        
        return clone;
    }
}

// ============================================================================
// ENTITY MANAGER - GERENCIA TODAS AS ENTIDADES DO JOGO
// ============================================================================

class EntityManager {
    constructor() {
        if (EntityManager.instance) {
            return EntityManager.instance;
        }
        
        this.entities = new Map();
        this.entityGroups = new Map();
        this.nextEntityId = 1;
        
        // Sistemas
        this.collisionSystem = new CollisionSystem(this);
        
        // Estatísticas
        this.stats = {
            totalCreated: 0,
            totalDestroyed: 0,
            active: 0,
            updatesPerSecond: 0,
            collisionsPerSecond: 0
        };
        
        EntityManager.instance = this;
    }
    
    static getInstance() {
        if (!EntityManager.instance) {
            EntityManager.instance = new EntityManager();
        }
        return EntityManager.instance;
    }
    
    /**
     * Cria uma nova entidade
     */
    createEntity(name = 'Entity', type = 'entity') {
        const id = `entity_${this.nextEntityId++}`;
        const entity = new Entity(id, name);
        entity.type = type;
        
        this.entities.set(id, entity);
        
        // Adiciona aos grupos
        this.addToGroup(entity, type);
        this.addToGroup(entity, 'all');
        
        this.stats.totalCreated++;
        this.stats.active++;
        
        return entity;
    }
    
    /**
     * Cria um jogador
     */
    createPlayer(config = {}) {
        const player = this.createEntity('Player', 'player');
        
        // Componentes do jogador
        player.addComponent(TransformComponent, {
            position: config.position || { x: 0, y: 0 }
        });
        
        player.addComponent(PhysicsComponent, {
            speed: config.speed || 150,
            acceleration: 800,
            friction: 0.85,
            mass: 1
        });
        
        player.addComponent(RenderComponent, {
            color: config.color || '#ff0000',
            width: config.width || 24,
            height: config.height || 24
        });
        
        player.addComponent(ColliderComponent, {
            type: 'circle',
            radius: config.radius || 12,
            collisionLayer: 'player',
            collidesWith: ['terrain', 'npc', 'creature', 'item']
        });
        
        // Tag especial
        player.addTag('player');
        player.addTag('controllable');
        
        return player;
    }
    
    /**
     * Cria um NPC
     */
    createNPC(config = {}) {
        const npc = this.createEntity(config.name || 'NPC', 'npc');
        
        // Componentes do NPC
        npc.addComponent(TransformComponent, {
            position: config.position || { x: 100, y: 100 }
        });
        
        npc.addComponent(PhysicsComponent, {
            speed: config.speed || 80,
            acceleration: 400,
            friction: 0.9,
            mass: 1
        });
        
        npc.addComponent(RenderComponent, {
            color: config.color || '#00aaff',
            width: config.width || 20,
            height: config.height || 20
        });
        
        npc.addComponent(ColliderComponent, {
            type: 'circle',
            radius: config.radius || 10,
            collisionLayer: 'npc',
            collidesWith: ['terrain', 'player', 'npc', 'creature']
        });
        
        npc.addComponent(AIComponent, {
            behavior: config.behavior || 'friendly',
            aggroRange: config.aggroRange || 150,
            sightRange: config.sightRange || 200
        });
        
        npc.addTag('npc');
        npc.addTag('ai_controlled');
        
        return npc;
    }
    
    /**
     * Cria uma criatura
     */
    createCreature(config = {}) {
        const creature = this.createEntity(config.name || 'Creature', 'creature');
        
        // Componentes da criatura
        creature.addComponent(TransformComponent, {
            position: config.position || { x: -100, y: -100 }
        });
        
        creature.addComponent(PhysicsComponent, {
            speed: config.speed || 100,
            acceleration: 500,
            friction: 0.9,
            mass: 1
        });
        
        creature.addComponent(RenderComponent, {
            color: config.color || '#ff6600',
            width: config.width || 28,
            height: config.height || 28
        });
        
        creature.addComponent(ColliderComponent, {
            type: 'circle',
            radius: config.radius || 14,
            collisionLayer: 'creature',
            collidesWith: ['terrain', 'player', 'npc']
        });
        
        creature.addComponent(AIComponent, {
            behavior: config.behavior || 'aggressive',
            aggroRange: config.aggroRange || 200,
            sightRange: config.sightRange || 250,
            attackRange: config.attackRange || 40
        });
        
        creature.addTag('creature');
        creature.addTag('ai_controlled');
        creature.addTag('combatant');
        
        return creature;
    }
    
    /**
     * Adiciona entidade a um grupo
     */
    addToGroup(entity, groupName) {
        if (!this.entityGroups.has(groupName)) {
            this.entityGroups.set(groupName, new Set());
        }
        this.entityGroups.get(groupName).add(entity);
    }
    
    /**
     * Remove entidade de um grupo
     */
    removeFromGroup(entity, groupName) {
        const group = this.entityGroups.get(groupName);
        if (group) {
            group.delete(entity);
        }
    }
    
    /**
     * Obtém entidades por grupo
     */
    getEntitiesByGroup(groupName) {
        return this.entityGroups.get(groupName) || new Set();
    }
    
    /**
     * Obtém entidades por tag
     */
    getEntitiesByTag(tag) {
        const entities = [];
        for (const entity of this.entities.values()) {
            if (entity.hasTag(tag)) {
                entities.push(entity);
            }
        }
        return entities;
    }
    
    /**
     * Obtém o jogador
     */
    getPlayer() {
        for (const entity of this.entities.values()) {
            if (entity.hasTag('player')) {
                return entity;
            }
        }
        return null;
    }
    
    /**
     * Atualiza todas as entidades
     */
    update(deltaTime) {
        // Atualiza sistema de colisão
        this.collisionSystem.update(deltaTime);
        
        // Atualiza cada entidade ativa
        let updateCount = 0;
        for (const entity of this.entities.values()) {
            if (entity.active) {
                entity.update(deltaTime);
                updateCount++;
            }
        }
        
        // Remove entidades inativas
        this.cleanup();
        
        // Atualiza estatísticas
        this.stats.updatesPerSecond = updateCount;
    }
    
    /**
     * Renderiza todas as entidades
     */
    render(context) {
        // Ordem de renderização
        const renderOrder = [
            'creature',
            'npc', 
            'player',
            'item',
            'projectile'
        ];
        
        for (const type of renderOrder) {
            const group = this.entityGroups.get(type);
            if (group) {
                for (const entity of group) {
                    if (entity.active) {
                        entity.render(context);
                    }
                }
            }
        }
    }
    
    /**
     * Remove entidades inativas
     */
    cleanup() {
        const toRemove = [];
        
        for (const [id, entity] of this.entities) {
            if (!entity.active) {
                toRemove.push(id);
                
                // Remove de todos os grupos
                for (const group of this.entityGroups.values()) {
                    group.delete(entity);
                }
                
                this.stats.active--;
                this.stats.totalDestroyed++;
            }
        }
        
        // Remove do mapa principal
        for (const id of toRemove) {
            this.entities.delete(id);
        }
    }
    
    /**
     * Destroi todas as entidades
     */
    clear() {
        for (const entity of this.entities.values()) {
            entity.destroy();
        }
        
        this.entities.clear();
        this.entityGroups.clear();
        
        this.stats.active = 0;
    }
    
    /**
     * Obtém estatísticas
     */
    getStats() {
        return {
            ...this.stats,
            totalEntities: this.entities.size,
            groups: Array.from(this.entityGroups.keys()).map(key => ({
                name: key,
                count: this.entityGroups.get(key)?.size || 0
            }))
        };
    }
    
    /**
     * Debug: loga informações das entidades
     */
    debugLog() {
        console.log('=== ENTITY MANAGER DEBUG ===');
        console.log(`Total Entities: ${this.entities.size}`);
        console.log(`Active: ${this.stats.active}`);
        console.log('Groups:');
        
        for (const [groupName, group] of this.entityGroups) {
            console.log(`  ${groupName}: ${group.size} entities`);
        }
        
        console.log('Player:', this.getPlayer());
        console.log('============================');
    }
}

// ============================================================================
// SISTEMA DE COLISÃO
// ============================================================================

class CollisionSystem {
    constructor(entityManager) {
        this.entityManager = entityManager;
        this.collisionLayers = new Map();
        this.collisionMatrix = new Map();
        this.broadPhase = new SpatialHashGrid(100, 100); // Grid de 100x100 células
        
        this.collisionCount = 0;
        this.collisionChecks = 0;
        
        this.setupDefaultLayers();
    }
    
    setupDefaultLayers() {
        // Define layers de colisão
        const layers = [
            'player',
            'npc', 
            'creature',
            'terrain',
            'item',
            'projectile',
            'trigger'
        ];
        
        layers.forEach(layer => {
            this.collisionLayers.set(layer, new Set());
        });
        
        // Define matriz de colisão (quem colide com quem)
        this.setCollisionRule('player', ['terrain', 'npc', 'creature', 'item']);
        this.setCollisionRule('npc', ['terrain', 'player', 'creature']);
        this.setCollisionRule('creature', ['terrain', 'player', 'npc']);
        this.setCollisionRule('terrain', ['player', 'npc', 'creature']);
        this.setCollisionRule('item', ['player']);
        this.setCollisionRule('projectile', ['creature', 'npc', 'terrain']);
        this.setCollisionRule('trigger', ['player']);
    }
    
    setCollisionRule(layer, collidesWith) {
        this.collisionMatrix.set(layer, new Set(collidesWith));
    }
    
    canCollide(layerA, layerB) {
        if (layerA === layerB && layerA !== 'player') {
            // Entidades do mesmo layer não colidem entre si (exceto player)
            return false;
        }
        
        const rulesA = this.collisionMatrix.get(layerA);
        const rulesB = this.collisionMatrix.get(layerB);
        
        return (rulesA && rulesA.has(layerB)) || (rulesB && rulesB.has(layerA));
    }
    
    update(deltaTime) {
        this.collisionCount = 0;
        this.collisionChecks = 0;
        
        // Atualiza grid espacial
        this.updateSpatialGrid();
        
        // Fase larga (broad phase)
        const potentialCollisions = this.broadPhaseCollisionDetection();
        
        // Fase estreita (narrow phase) e resolução
        this.narrowPhaseCollisionResolution(potentialCollisions);
    }
    
    updateSpatialGrid() {
        // Limpa grid
        this.broadPhase.clear();
        
        // Adiciona entidades com collider ao grid
        for (const entity of this.entityManager.entities.values()) {
            if (!entity.active) continue;
            
            const collider = entity.getComponent('ColliderComponent');
            if (!collider || collider.type === 'none') continue;
            
            const transform = entity.getComponent('TransformComponent');
            if (!transform) continue;
            
            // Adiciona ao grid espacial
            this.broadPhase.insert(entity, transform.position.x, transform.position.y, 
                                 collider.radius || Math.max(collider.width, collider.height));
        }
    }
    
    broadPhaseCollisionDetection() {
        const potentialCollisions = new Set();
        
        for (const entity of this.entityManager.entities.values()) {
            if (!entity.active) continue;
            
            const collider = entity.getComponent('ColliderComponent');
            if (!collider || collider.type === 'none') continue;
            
            const transform = entity.getComponent('TransformComponent');
            if (!transform) continue;
            
            // Busca entidades próximas no grid
            const nearbyEntities = this.broadPhase.query(
                transform.position.x,
                transform.position.y,
                collider.radius * 2 || Math.max(collider.width, collider.height) * 2
            );
            
            for (const otherEntity of nearbyEntities) {
                if (entity === otherEntity) continue;
                
                // Verifica se já testamos este par
                const pairKey = this.getEntityPairKey(entity, otherEntity);
                if (potentialCollisions.has(pairKey)) continue;
                
                potentialCollisions.add(pairKey);
            }
        }
        
        return potentialCollisions;
    }
    
    narrowPhaseCollisionResolution(potentialCollisions) {
        for (const pairKey of potentialCollisions) {
            const [idA, idB] = pairKey.split('|');
            const entityA = this.entityManager.entities.get(idA);
            const entityB = this.entityManager.entities.get(idB);
            
            if (!entityA || !entityB || !entityA.active || !entityB.active) continue;
            
            const colliderA = entityA.getComponent('ColliderComponent');
            const colliderB = entityB.getComponent('ColliderComponent');
            
            if (!colliderA || !colliderB) continue;
            
            // Verifica se as layers podem colidir
            if (!this.canCollide(colliderA.collisionLayer, colliderB.collisionLayer)) {
                continue;
            }
            
            this.collisionChecks++;
            
            // Verifica colisão específica
            const collisionData = colliderA.checkCollision(colliderB);
            
            if (collisionData && collisionData.collides) {
                this.collisionCount++;
                
                // Atualiza estado dos colliders
                colliderA.isColliding = true;
                colliderB.isColliding = true;
                colliderA.collisions.add(entityB);
                colliderB.collisions.add(entityA);
                
                // Notifica as entidades
                if (!colliderA.isTrigger && !colliderB.isTrigger) {
                    this.resolveCollision(entityA, entityB, collisionData);
                }
                
                entityA.onCollision(entityB, collisionData);
                entityB.onCollision(entityA, {
                    ...collisionData,
                    normal: {
                        x: -collisionData.normal.x,
                        y: -collisionData.normal.y
                    }
                });
            } else {
                // Remove do estado de colisão se não está mais colidindo
                if (colliderA.collisions.has(entityB)) {
                    colliderA.collisions.delete(entityB);
                    if (colliderA.collisions.size === 0) {
                        colliderA.isColliding = false;
                    }
                }
                
                if (colliderB.collisions.has(entityA)) {
                    colliderB.collisions.delete(entityA);
                    if (colliderB.collisions.size === 0) {
                        colliderB.isColliding = false;
                    }
                }
            }
        }
    }
    
    resolveCollision(entityA, entityB, collisionData) {
        // Resolução física simples
        const transformA = entityA.getComponent('TransformComponent');
        const transformB = entityB.getComponent('TransformComponent');
        
        if (!transformA || !transformB) return;
        
        const physicsA = entityA.getComponent('PhysicsComponent');
        const physicsB = entityB.getComponent('PhysicsComponent');
        
        // Calcula massa relativa
        const massA = physicsA ? physicsA.mass : 1;
        const massB = physicsB ? physicsB.mass : 1;
        const totalMass = massA + massB;
        
        // Fator de penetração
        const penetration = collisionData.penetration;
        const normal = collisionData.normal;
        
        // Move as entidades para fora uma da outra
        if (transformA && !entityA.hasTag('terrain')) {
            transformA.position.x += normal.x * penetration * (massB / totalMass);
            transformA.position.y += normal.y * penetration * (massB / totalMass);
        }
        
        if (transformB && !entityB.hasTag('terrain')) {
            transformB.position.x -= normal.x * penetration * (massA / totalMass);
            transformB.position.y -= normal.y * penetration * (massA / totalMass);
        }
        
        // Transferência de momento (simplificada)
        if (physicsA && physicsB) {
            const relativeVelocity = {
                x: physicsA.velocity.x - physicsB.velocity.x,
                y: physicsA.velocity.y - physicsB.velocity.y
            };
            
            const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;
            
            if (velocityAlongNormal < 0) {
                const restitution = 0.8; // Coeficiente de restituição
                const impulseScalar = -(1 + restitution) * velocityAlongNormal / (1/massA + 1/massB);
                
                const impulse = {
                    x: impulseScalar * normal.x,
                    y: impulseScalar * normal.y
                };
                
                physicsA.velocity.x += impulse.x / massA;
                physicsA.velocity.y += impulse.y / massA;
                physicsB.velocity.x -= impulse.x / massB;
                physicsB.velocity.y -= impulse.y / massB;
            }
        }
    }
    
    getEntityPairKey(entityA, entityB) {
        // Garante que a chave seja sempre a mesma para o par, independente da ordem
        return entityA.id < entityB.id 
            ? `${entityA.id}|${entityB.id}`
            : `${entityB.id}|${entityA.id}`;
    }
    
    getStats() {
        return {
            collisions: this.collisionCount,
            checks: this.collisionChecks,
            efficiency: this.collisionChecks > 0 
                ? (this.collisionCount / this.collisionChecks * 100).toFixed(1) + '%'
                : '0%'
        };
    }
}

// ============================================================================
// SPATIAL HASH GRID - OTIMIZAÇÃO PARA DETECÇÃO DE COLISÃO
// ============================================================================

class SpatialHashGrid {
    constructor(cellSize = 100, gridSize = 1000) {
        this.cellSize = cellSize;
        this.gridSize = gridSize;
        this.grid = new Map();
        
        // Calcula número de células
        this.cellsX = Math.ceil(gridSize / cellSize);
        this.cellsY = Math.ceil(gridSize / cellSize);
    }
    
    getCellHash(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }
    
    getCellRange(x, y, radius) {
        const minX = Math.floor((x - radius) / this.cellSize);
        const maxX = Math.floor((x + radius) / this.cellSize);
        const minY = Math.floor((y - radius) / this.cellSize);
        const maxY = Math.floor((y + radius) / this.cellSize);
        
        const cells = [];
        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                cells.push(`${cx},${cy}`);
            }
        }
        return cells;
    }
    
    insert(entity, x, y, radius) {
        const cellHashes = this.getCellRange(x, y, radius);
        
        for (const hash of cellHashes) {
            if (!this.grid.has(hash)) {
                this.grid.set(hash, new Set());
            }
            this.grid.get(hash).add(entity);
        }
        
        // Armazena informação das células onde a entidade está
        if (!entity.spatialCells) {
            entity.spatialCells = new Set();
        }
        cellHashes.forEach(hash => entity.spatialCells.add(hash));
    }
    
    remove(entity) {
        if (!entity.spatialCells) return;
        
        for (const hash of entity.spatialCells) {
            const cell = this.grid.get(hash);
            if (cell) {
                cell.delete(entity);
                if (cell.size === 0) {
                    this.grid.delete(hash);
                }
            }
        }
        
        entity.spatialCells.clear();
    }
    
    query(x, y, radius) {
        const cellHashes = this.getCellRange(x, y, radius);
        const results = new Set();
        
        for (const hash of cellHashes) {
            const cell = this.grid.get(hash);
            if (cell) {
                for (const entity of cell) {
                    results.add(entity);
                }
            }
        }
        
        return results;
    }
    
    clear() {
        this.grid.clear();
        
        // Limpa referências das células nas entidades
        for (const entity of EntityManager.getInstance().entities.values()) {
            if (entity.spatialCells) {
                entity.spatialCells.clear();
            }
        }
    }
}

// ============================================================================
// INTEGRAÇÃO COM O SISTEMA EXISTENTE
// ============================================================================

// Atualiza o GameEngine para usar o EntityManager
GameEngine.prototype.initializeEntities = function() {
    // Inicializa EntityManager
    this.entityManager = EntityManager.getInstance();
    
    // Cria jogador
    this.playerEntity = this.entityManager.createPlayer({
        position: { x: 0, y: 0 },
        speed: 180,
        color: '#ff3333',
        radius: 14
    });
    
    // Cria alguns NPCs para teste
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const distance = 200;
        this.entityManager.createNPC({
            name: `Villager ${i + 1}`,
            position: {
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance
            },
            behavior: i % 2 === 0 ? 'friendly' : 'patrol',
            color: '#33aaff'
        });
    }
    
    // Cria algumas criaturas para teste
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
        const distance = 300;
        this.entityManager.createCreature({
            name: `Goblin ${i + 1}`,
            position: {
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance
            },
            behavior: 'aggressive',
            color: '#ff6633'
        });
    }
    
    console.log('✅ Sistema de entidades inicializado');
    console.log(`📊 ${this.entityManager.entities.size} entidades criadas`);
};

// Atualiza o método update do GameEngine
GameEngine.prototype.update = function(deltaTime) {
    this.stats.updates++;
    
    // Atualiza inputs
    this.inputManager.update();
    
    // Processa inputs do jogador
    this.processPlayerInput();
    
    // Atualiza EntityManager
    this.entityManager.update(deltaTime);
    
    // Atualiza player reference
    this.player = this.entityManager.getPlayer();
    
    // Atualiza câmera
    if (this.player) {
        const transform = this.player.getComponent('TransformComponent');
        if (transform) {
            this.camera.update({ position: transform.position }, deltaTime);
        }
    }
    
    // Atualiza mundo
    this.world.update(this.player ? this.player.position : { x: 0, y: 0 });
    
    // Processa zoom
    this.processCameraZoom();
};

// Novo método para processar input do jogador
GameEngine.prototype.processPlayerInput = function() {
    const player = this.entityManager.getPlayer();
    if (!player) return;
    
    const physics = player.getComponent('PhysicsComponent');
    if (!physics) return;
    
    // Movimento
    const direction = this.inputManager.getMovementDirection();
    physics.setMovementInput(direction.x, direction.y);
    
    // Ações
    if (this.inputManager.isKeyDown(' ')) { // Espaço para pular
        physics.jump(250);
    }
};

// Processa zoom da câmera
GameEngine.prototype.processCameraZoom = function() {
    const mouseWheel = this.inputManager.mouse.wheel;
    if (mouseWheel !== 0) {
        this.camera.applyZoom(-mouseWheel);
    }
    
    // Tecla R para resetar câmera
    if (this.inputManager.isKeyDown('r')) {
        this.camera.reset();
    }
};

// Atualiza o método render do GameEngine
GameEngine.prototype.render = function() {
    this.stats.renders++;
    
    // Limpa o canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Salva estado do contexto
    this.context.save();
    
    // Aplica transformações da câmera
    this.camera.applyTransform(this.context);
    
    // Renderiza o mundo
    this.world.render(this.context, this.camera);
    
    // Renderiza entidades
    this.entityManager.render(this.context);
    
    // Restaura estado do contexto
    this.context.restore();
    
    // Renderiza UI
    this.renderUI();
};

// Atualiza UI para mostrar informações de entidades
GameEngine.prototype.renderUI = function() {
    this.context.save();
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    
    // Painel de debug
    this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.context.fillRect(10, 10, 350, 180);
    
    this.context.fillStyle = '#ffffff';
    this.context.font = '12px monospace';
    this.context.textBaseline = 'top';
    
    const player = this.entityManager.getPlayer();
    const playerPos = player?.getComponent('TransformComponent')?.position || { x: 0, y: 0 };
    const playerVel = player?.getComponent('PhysicsComponent')?.velocity || { x: 0, y: 0 };
    
    const collisionStats = this.entityManager.collisionSystem?.getStats() || { collisions: 0, checks: 0 };
    const entityStats = this.entityManager.getStats();
    
    const debugInfo = [
        `FPS: ${this.fps}`,
        `Delta: ${this.deltaTime.toFixed(4)}`,
        `Player: (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)})`,
        `Speed: (${playerVel.x.toFixed(1)}, ${playerVel.y.toFixed(1)})`,
        `Entities: ${entityStats.active}/${entityStats.totalEntities}`,
        `Collisions: ${collisionStats.collisions} (${collisionStats.efficiency})`,
        `Chunks: ${this.stats.chunksLoaded}`,
        `Updates: ${this.stats.updates}, Renders: ${this.stats.renders}`
    ];
    
    debugInfo.forEach((info, index) => {
        this.context.fillText(info, 20, 20 + index * 18);
    });
    
    // Instruções expandidas
    this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.context.fillRect(10, this.canvas.height - 100, 300, 90);
    
    this.context.fillStyle = '#ffffff';
    const instructions = [
        'CONTROLES:',
        'WASD / Setas - Mover',
        'Espaço - Pular (teste)',
        'Scroll - Zoom',
        'R - Resetar Câmera',
        'F1 - Debug Colisões',
        'F2 - Debug Entidades'
    ];
    
    instructions.forEach((instruction, index) => {
        this.context.fillText(instruction, 20, this.canvas.height - 90 + index * 16);
    });
    
    this.context.restore();
};

// Adiciona flags de debug
GameConfig.DEBUG_COLLIDERS = false;
GameConfig.DEBUG_ENTITIES = false;

// Adiciona handlers para teclas de debug
document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
        GameConfig.DEBUG_COLLIDERS = !GameConfig.DEBUG_COLLIDERS;
        console.log(`Debug Colisões: ${GameConfig.DEBUG_COLLIDERS}`);
    }
    
    if (e.key === 'F2') {
        GameConfig.DEBUG_ENTITIES = !GameConfig.DEBUG_ENTITIES;
        console.log(`Debug Entidades: ${GameConfig.DEBUG_ENTITIES}`);
    }
    
    if (e.key === 'F3') {
        window.game?.entityManager?.debugLog();
    }
    
    if (e.key === 'F5') {
        // Cria uma nova criatura na posição do mouse
        const game = window.game;
        if (game && game.entityManager && game.camera) {
            const mouseWorld = game.camera.screenToWorld(
                game.inputManager.mouse.x,
                game.inputManager.mouse.y
            );
            
            game.entityManager.createCreature({
                name: 'Test Creature',
                position: mouseWorld,
                behavior: 'aggressive',
                color: `#${Math.floor(Math.random()*16777215).toString(16)}`
            });
            
            console.log('Criatura criada em:', mouseWorld);
        }
    }
});

// Atualiza a inicialização do GameEngine
const originalInitialize = GameEngine.prototype.initialize;
GameEngine.prototype.initialize = function() {
    originalInitialize.call(this);
    
    // Inicializa entidades após o carregamento
    setTimeout(() => {
        this.initializeEntities();
    }, 100);
};

console.log('✅ Parte 2 - Sistema de Entidades e Colisões carregado!');
console.log('📋 Comandos disponíveis:');
console.log('  F1 - Alternar debug de colisões');
console.log('  F2 - Alternar debug de entidades');
console.log('  F3 - Log de debug do EntityManager');
console.log('  F5 - Criar criatura na posição do mouse');