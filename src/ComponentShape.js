import * as PIXI from 'pixi.js';

export class ComponentShape {
    static source() {
        return {
            type: 'Source',
            indexes: [
                0, 0,
                80, 0,
                100, 20,
                80, 40,
                0, 40,
                0, 0
            ],
            startPoints: [
                [100, 20],
            ],
            endPoints: [],
        }
    }

    static worker() {
        return {
            type: 'Worker',
            indexes: [
                0, 0,
                80, 0,
                100, 20,
                80, 40,
                0, 40,
                20, 20,
            ],
            startPoints: [
                [100, 20],
            ],
            endPoints: [
                [20, 20],
            ]
        }
    }

    static collector() {
        return {
            type: 'Collector',
            indexes: [
                0, 0,
                100, 0,
                100, 40,
                0, 40,
                20, 20,
            ],
            startPoints: [],
            endPoints: [
                [20, 20],
            ]
        }
    }

    static aggregator() {
        return {
            type: 'Aggregator',
            indexes: [
                0, 0,
                40, 0,
                40, -20,
                60, -20,
                60, 0,
                80, 0,
                100, 20,
                80, 40,
                60, 40,
                60, 60,
                40, 60,
                40, 40,
                0, 40,
                20, 20,
            ],
            startPoints: [
                [100, 20],
            ],
            endPoints: [
                [20, 20],
            ]
        }
    }
}

class ComponentModel {
    constructor(name, type) {
        this.name = name
        this.type = type.toLowerCase()
        this.async = 1
        this.packSize = 0
        this.func = ""
        this.funcParams = ""
    }
}

export class Component {
    constructor(id, x, y, shape, workspace) {
        this.id = id
        this.model = new ComponentModel(shape.type+'_'+id, shape.type);
        this.attachmentRadius = 7
        this.workspace = workspace

        this._component = new PIXI.Graphics()
            .beginFill(0xffffff)
            .drawPolygon(shape.indexes)
            .endFill();

        this._component.component = this;
        this._component.zIndex = 9999 // more than edges
        this._component.interactive = true;
        this._component.buttonMode = true;

        this._component.pivot.x = 50;
        this._component.pivot.y = 20;
        this._component.x = x
        this._component.y = y

        this._initText()
        this._initStartPoints(shape)
        this._initEndPoints(shape)

        this._component
            .on('pointerdown', onPointerDown)
            .on('pointerup', onDragEnd)
            .on('pointerupoutside', onDragEnd)
            .on('pointermove', onDragMove);

        this._component
            .on('pointerdown', (event) => {
                this.workspace.hideRightPanel()
                document.getElementById('component_type').innerText = shape.type

                const nameInput = document.getElementById('component_name');
                nameInput.value = this.model.name;
                nameInput.oninput = () => {
                    this.model.name = nameInput.value;
                    this._componentNameText.text = nameInput.value;
                }

                const asyncInput = document.getElementById('component_async');
                asyncInput.value = this.model.async;
                asyncInput.oninput = () => {
                    this.model.async = parseInt(asyncInput.value);
                    this._componentAsyncText.text = asyncInput.value;
                }

                if (this.model.type === 'aggregator') {
                    const packSizeInput = document.getElementById('component_pack_size');
                    packSizeInput.value = this.model.packSize;
                    packSizeInput.oninput = () => {
                        this.model.packSize = parseInt(packSizeInput.value);
                    }

                    document.getElementById('aggregation_settings').style.display = 'block'
                } else {
                    const functionsList = document.getElementById('component_function')
                    functionsList.value = this.model.func
                    functionsList.onchange = () => {
                        this.model.func = functionsList.value;
                    }

                    const functionParamsInput = document.getElementById('component_function_params');
                    functionParamsInput.value = this.model.funcParams;
                    functionParamsInput.oninput = () => {
                        this.model.funcParams = functionParamsInput.value;
                    }

                    document.getElementById('function_settings').style.display = 'block'
                }

                document.getElementById('component_settings').style.display = 'block'
                document.getElementById('component_remove').onclick = () => {
                    document.getElementById('component_settings').style.display = 'none'
                    this.workspace.removeComponent(this)
                }
                event.stopPropagation()
            })
    }

    loadFromModelDescription(desc) {
        this.model.name = desc['name'];
        this._componentNameText.text = desc['name'];

        this.model.async = desc['async'];
        this._componentAsyncText.text = desc['async'].toString();

        this.model.func = desc['function'];
        if (desc['function_parameters'] !== undefined) {
            this.model.funcParams = desc['function_parameters'].join('$');
        }
    }


    _initText() {
        this._componentNameText = new PIXI.Text(this.model.name,
            {fontFamily : 'Arial', fontSize: 12, fill : 0x000000, align : 'center'})
        this._componentNameText.anchor.x = 0.5;
        this._componentNameText.x = this._component.getBounds().width/2;
        this._component.addChild(this._componentNameText)

        this._componentAsyncText = new PIXI.Text(this.model.async,
            {fontFamily : 'Arial', fontSize: 12, fill : 0x000000, align : 'center'})
        this._componentAsyncText.anchor.x = 0.5;
        this._componentAsyncText.anchor.y = 0.5;
        this._componentAsyncText.x = this._component.getBounds().width/2;
        this._componentAsyncText.y = this._component.getBounds().height/2;
        this._component.addChild(this._componentAsyncText)
    }

    _initStartPoints(shape) {
        for (let startPoint of shape.startPoints) {
            const stP = new PIXI.Graphics()
                .beginFill(0, 0.1)
                .lineStyle(3, 0xffff00, 1)
                .drawCircle(startPoint[0], startPoint[1], this.attachmentRadius)
                .endFill();

            stP.interactive = true
            stP.on('pointerdown', (event) => {
                const inParentPosition = event.data.getLocalPosition(this._component.parent);
                this.workspace.startDrawingConnection(inParentPosition.x, inParentPosition.y, this)
                event.stopPropagation()
            })

            this._component.addChild(stP)
        }
    }

    _initEndPoints(shape) {
        for (let endPoint of shape.endPoints) {
            const enP = new PIXI.Graphics()
                .beginFill(0, 0.1)
                .lineStyle(3, 0xff00ff, 1)
                .drawCircle(endPoint[0], endPoint[1], this.attachmentRadius)
                .endFill();

            enP.interactive = true
            enP.on('pointerdown', (event) => event.stopPropagation())
            enP.on('pointerup', (event) => {
                this.workspace.stopDrawingConnection(this)
                event.stopPropagation()
            })

            this._component.addChild(enP)
        }
    }

    toJSON() {
        if (this.model.type === 'aggregator') {
            return {
                "name": this.model.name,
                "type": this.model.type,
                "async": this.model.async,
                "pack_size": this.model.packSize,
            }
        } else {
            return {
                "name": this.model.name,
                "type": this.model.type,
                "async": this.model.async,
                "function": this.model.func,
                "function_parameters": this.model.funcParams.split('$')
            }
        }
    }

    get graphics() {
        return this._component;
    }

    get x() {
        return this._component.x;
    }

    get y() {
        return this._component.y;
    }
}

function onPointerDown(event) {
    this.data = event.data;
    this.dragging = true;

    event.stopPropagation()
}

function onDragEnd() {
    this.dragging = false;
    this.data = null;
}

function onDragMove() {
    if (this.dragging) {
        const newPosition = this.data.getLocalPosition(this.parent);
        const dx = newPosition.x - this.x
        const dy = newPosition.y - this.y

        this.x = newPosition.x;
        this.y = newPosition.y;

        this.component.workspace.positionChanged(this.component, dx, dy);
    }
}
