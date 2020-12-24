import * as PIXI from 'pixi.js';

class EdgeModel {
    constructor() {
        this.buff = 0
        this.priority = 1
        this.func = ""
        this.funcParams = ""
    }
}

export class ComponentEdge {
    constructor(x1, y1, x2, y2, from, to, workspace) {
        this.workspace = workspace;
        this.model = new EdgeModel();

        this.start = [x1, y1];
        this.end = [x2, y2];
        this.from = from;
        this.to = to;

        this._graphics = new PIXI.Graphics();
        this.draw();
    }

    makeInteractive() {
        this._graphics.interactive = true;
        this._graphics.buttonMode = true;
        this._graphics
            .on('pointerdown', (event) => {
                this.workspace.hideRightPanel()
                document.getElementById('edge_from_to').innerText
                    = this.from.model.name + ' -> ' + this.to.model.name;

                const bufferInput = document.getElementById('edge_buffer');
                bufferInput.value = this.model.buff;
                bufferInput.oninput = () => {
                    this.model.buff = parseInt(bufferInput.value);
                }

                const priorityInput = document.getElementById('edge_priority');
                priorityInput.value = this.model.priority;
                priorityInput.oninput = () => {
                    this.model.priority = parseInt(priorityInput.value);
                    this.draw();
                }

                const conditionList = document.getElementById('condition_function')
                conditionList.value = this.model.func
                conditionList.onchange = () => {
                    this.model.func = conditionList.value;
                    this.draw();
                }

                const functionParamsInput = document.getElementById('condition_function_params');
                functionParamsInput.value = this.model.funcParams;
                functionParamsInput.oninput = () => {
                    this.model.funcParams = functionParamsInput.value;
                }

                document.getElementById('edge_settings').style.display = 'block'
                document.getElementById('edge_remove').onclick = () => {
                    document.getElementById('edge_settings').style.display = 'none'
                    this.workspace.removeEdge(this)
                }
                event.stopPropagation()
            })
    }

    loadFromModelDescription(desc) {
        this.model.buff = desc['buffer'];
        this.model.priority = desc['priority'];
        this.model.func = desc['condition_function'];
        if (desc['function_parameters'] !== undefined) {
            this.model.funcParams = desc['function_parameters'].join('$');
        }
        this.draw();
    }

    moveStart(dx, dy) {
        this.changeStart(this.start[0]+dx, this.start[1]+dy);
    }

    changeStart(x1, y1) {
        this._graphics.clear()
        this.start = [x1, y1]

        this.draw()
    }

    moveEnd(dx, dy) {
        this.changeEnd(this.end[0]+dx, this.end[1]+dy);
    }

    changeEnd(x2, y2) {
        // TODO: hitarea
        this._graphics.clear()
        this.end = [x2, y2]

        this.draw()
    }

    draw() {
        this._graphics
            .lineStyle(5,0xff00000,1)
            .moveTo(this.start[0], this.start[1])
            .lineTo(this.end[0], this.end[1])
        this._graphics.hitArea = this._graphics.getBounds()
        this._graphics.removeChildren();

        const dx = this.end[0]-this.start[0]
        const dy = this.end[1]-this.start[1]
        const hyp =  Math.sqrt(dx*dx+dy*dy)

        const vec = [dx/hyp, dy/hyp]
        const normal = [vec[1], -vec[0]];
        for (let i = 0; i < this.model.priority; i++) {
            const stepSize = 40+10*i // initial step = 20 (when i is 0), others are = 10
            const cX = this.start[0]+stepSize*vec[0]
            const cY = this.start[1]+stepSize*vec[1]

            const pLine = new PIXI.Graphics()
                .lineStyle(5,0xff00000,1)
                .moveTo(cX+normal[0]*10, cY+normal[1]*10)
                .lineTo(cX-normal[0]*10, cY-normal[1]*10)

            this._graphics.addChild(pLine)
        }

        if (this.model.func !== "") {
            const diamond = new PIXI.Graphics()
                .beginFill(0xff00000,1)
                .drawRect(-20, -20, 40, 40)
                .endFill();
            diamond.position.set(this.start[0]+vec[0]*hyp/2, this.start[1]+vec[1]*hyp/2);
            diamond.rotation = Math.acos(dx/hyp)*Math.sign(dy) + Math.PI / 4;

            this._graphics.addChild(diamond);
        }
    }

    toJSON(idMap) {
        return {
            "from": idMap.get(this.from.id),
            "to": idMap.get(this.to.id),
            "buffer": this.model.buff,
            "priority": this.model.priority,
            "condition_function": this.model.func,
            "function_parameters": this.model.funcParams.split('$'),
        }
    }

    get graphics() {
        return this._graphics;
    }
}