import * as PIXI from 'pixi.js';
import {Component, ComponentShape} from "./ComponentShape";
import {ComponentEdge} from "./ComponentEdge";

export class WorkspaceStage {
    constructor(x0, y0, x1, y1, term) {
        this.width = x1-x0;
        this.hight = y1-y0;
        this.term = term;

        this.componentsIDGenerator = 0
        this.edgeIDGenerator = 0

        this.components = []
        this.edges = []

        this.container = new PIXI.Container();
        this._activeConnection = null

        this.container.hitArea = new PIXI.Rectangle(x0, y0, this.width, this.hight)
        this.container.sortableChildren = true
        this.container.interactive = true

        this.container.on('pointerdown', () => this.hideRightPanel())
        this.container.on('pointermove', (event) => {
            if (this._activeConnection == null) {
                return
            }

            const newPosition = event.data.getLocalPosition(this.container);
            this._activeConnection.changeEnd(newPosition.x, newPosition.y)
        })
        this.container.on('pointerup', () => {
            if (this._activeConnection == null) {
                return
            }

            this.container.removeChild(this._activeConnection.graphics)
            this._activeConnection = null
        })

        const refreshPackagesBtn = document.getElementById('refresh_packages')
        refreshPackagesBtn.onclick = () => this.refreshPackages()

        const compileBtn = document.getElementById('compile')
        compileBtn.onclick = () => this.compile()

        const saveBtn = document.getElementById('save')
        saveBtn.onclick = () => this.saveWorkspace()

        const openBtn = document.getElementById('open')
        openBtn.onclick = () => this.openWorkspace()

        // load packages
        this.refreshPackages()
    }

    clear() {
        this.componentsIDGenerator = 0
        this.edgeIDGenerator = 0
        this.components = []
        this.edges = []
        this.container.removeChildren()
    }

    saveWorkspace() {
        const workspaceJSON = JSON.stringify(this.toJSON(true))
        const blob = new Blob([workspaceJSON], {type: 'application/json;charset=utf-8'});
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = "stream";
        link.click();
    }

    openWorkspace() {
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.onchange = () => {
            if (fileInput.files.length === 0) {
                return
            }
            const file = fileInput.files[0]
            const reader = new FileReader();
            reader.readAsText(file,'UTF-8');

            reader.onload = readerEvent => {
                const description = JSON.parse(readerEvent.target.result.toString());
                this.clear()

                description['components'].forEach(compJSON => {
                   this.addComponent(compJSON.type+'_box', compJSON.x * this.width, compJSON.y * this.hight, compJSON)
                })
                description['connections'].forEach(connJSON => {
                    const conn = new ComponentEdge(
                        connJSON['from_pos'][0] * this.width, connJSON['from_pos'][1] * this.hight,
                        connJSON['to_pos'][0] * this.width, connJSON['to_pos'][1] * this.hight,
                        this.components[connJSON['from']], this.components[connJSON['to']], this);
                    conn.loadFromModelDescription(connJSON)
                    conn.makeInteractive()

                    conn.id = this.edgeIDGenerator;
                    this.edges.push(conn)
                    this.container.addChild(conn.graphics);
                    this.edgeIDGenerator++
                })

            }
        }

        fileInput.click()
    }

    refreshPackages() {
        this.term.writeln('Refreshing...')
        fetch('http://127.0.0.1:8081/packages').then(resp => {
            resp.json().then(respJSON => {
                console.log(respJSON)
                if (respJSON['message'] !== undefined) {
                    console.log(respJSON['message'])
                    respJSON['message'].split('\n').forEach(l => this.term.writeln(l))
                    return
                }

                this.refreshPackagesList(respJSON['packages'])
                this.refreshFunctionList(respJSON['functions'])

                this.term.writeln('Refreshed!')
            })
        })
    }

    refreshPackagesList(packages) {
        const list = document.getElementById('packages_list')
        while (list.firstChild) {
            list.removeChild(list.lastChild);
        }

        packages.forEach(fName => {
            const listElem = document.createElement('li')
            listElem.appendChild(document.createTextNode(fName))
            list.appendChild(listElem)
        })
    }

    refreshFunctionList(functions) {
        const functionsList = document.getElementById('component_function')
        while (functionsList.firstChild) {
            functionsList.removeChild(functionsList.lastChild);
        }

        const conditionsList = document.getElementById('condition_function')
        while (conditionsList.firstChild) {
            conditionsList.removeChild(conditionsList.lastChild);
        }

        functions.forEach(fName => {
            const funOpt = document.createElement('option')
            funOpt.innerText = fName
            funOpt.setAttribute('value', fName)
            functionsList.appendChild(funOpt)

            const condOpt = document.createElement('option')
            condOpt.innerText = fName
            condOpt.setAttribute('value', fName)
            conditionsList.appendChild(condOpt)
        })
    }

    compile() {
        this.term.writeln('Compiling...')
        fetch('http://127.0.0.1:8081/compile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(this.toJSON(false))
        }).then(resp => {
            if (!resp.ok) {
                return resp.json()
            }
            return resp;
        }).then(resp => {
            if (resp['message'] !== undefined) {
                console.log(resp['message'])
                resp['message'].split('\n').forEach(l => this.term.writeln(l))
                return
            }

            resp.arrayBuffer().then(buf => {
                const blob = new Blob([buf], {type: "octet/stream"});
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = "compiled";
                link.click();
                this.term.writeln('Compiled!')
            })
        })
    }

    hideRightPanel() {
        document.getElementById('component_settings').style.display = 'none'
        document.getElementById('function_settings').style.display = 'none'
        document.getElementById('aggregation_settings').style.display = 'none'

        document.getElementById('edge_settings').style.display = 'none'
    }

    addComponent(type, x, y, desc) {
        let component = null
        switch (type) {
            case 'source_box':
                component = new Component(this.componentsIDGenerator, x, y, ComponentShape.source(), this);
                break;
            case 'worker_box':
                component = new Component(this.componentsIDGenerator, x, y, ComponentShape.worker(), this);
                break;
            case 'collector_box':
                component = new Component(this.componentsIDGenerator, x, y, ComponentShape.collector(), this);
                break;
            case 'aggregator_box':
                component = new Component(this.componentsIDGenerator, x, y, ComponentShape.aggregator(), this);
                break;
            default:
                return;
        }

        this.componentsIDGenerator++;
        this.container.addChild(component.graphics);
        this.components.push(component);

        if (desc !== undefined) {
            component.loadFromModelDescription(desc)
        }
    }

    removeComponent(comp) {
        this.components = this.components.filter(c => c.id !== comp.id)
        this.container.removeChild(comp.graphics);

        this.edges
            .filter(edge => edge.from.id === comp.id || edge.to.id === comp.id)
            .forEach(edge => this.container.removeChild(edge.graphics))

        this.edges = this.edges.filter(edge => edge.from.id !== comp.id && edge.to.id !== comp.id)
    }

    removeEdge(edge) {
        this.edges = this.edges.filter(e => e.id !== edge.id);
        this.container.removeChild(edge.graphics);
    }

    startDrawingConnection(x, y, component) {
        if (this._activeConnection != null) {
            return
        }
        this._activeConnection = new ComponentEdge(x, y, x, y, component, null, this);
        this.container.addChild(this._activeConnection.graphics);
    }

    stopDrawingConnection(to) {
        this._activeConnection.to = to
        this._activeConnection.makeInteractive()

        this._activeConnection.id = this.edgeIDGenerator;
        this.edges.push(this._activeConnection)

        this.edgeIDGenerator++
        this._activeConnection = null
    }

    positionChanged(comp, dx, dy) {
        this.edges
            .filter(edge => edge.from.id === comp.id)
            .forEach(edge => edge.moveStart(dx,dy))

        this.edges
            .filter(edge => edge.to.id === comp.id)
            .forEach(edge => edge.moveEnd(dx,dy))
    }

    toJSON(withPositions) {
        const idMap = new Map()

        const components = [];
        this.components.forEach(comp => {
            idMap.set(comp.id, components.length);
            const compJSON = comp.toJSON();
            if (withPositions) {
                compJSON.x = comp.x / this.width;
                compJSON.y = comp.y / this.hight;
            }

            components.push(compJSON);
        });

        const connections = [];
        this.edges.forEach(edge => {
            const connJSON = edge.toJSON(idMap);
            if (withPositions) {
                connJSON['from_pos'] = [edge.start[0] / this.width, edge.start[1] / this.hight];
                connJSON['to_pos'] =  [edge.end[0] / this.width, edge.end[1] / this.hight];
            }

            connections.push(connJSON);
        });
        connections.sort((a, b) => a.priority - b.priority)

        return {
            "components": components,
            "connections": connections,
        }
    }
}