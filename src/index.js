import * as PIXI from 'pixi.js';
import {WorkspaceStage} from "./WorkspaceStage";
import {Terminal} from "xterm";
import {FitAddon} from "xterm-addon-fit";

/* disable fly ghost component */
document.ondragover = (ev => ev.preventDefault())

const wsDiv = document.getElementById('workspace')
const workspaceWidth = wsDiv.getBoundingClientRect().width
const workspaceHeight = wsDiv.getBoundingClientRect().height
const rendererWorkspace = PIXI.autoDetectRenderer({
    width: workspaceWidth,
    height: workspaceHeight,
    antialias: true,
})
// TODO: handle resize properly
window.addEventListener('resize',() => rendererWorkspace.resize(window.innerWidth, window.innerHeight));
wsDiv.appendChild(rendererWorkspace.view)

const termDiv = document.getElementById('terminal')
const term = new Terminal({
    'theme': { background: '#222222' }
})
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(termDiv);
fitAddon.fit();

const workspace = new WorkspaceStage(0, 0, workspaceWidth, workspaceHeight, term)

let componentsLib = document.querySelectorAll('#leftSideNav .box')
componentsLib.forEach((item) => {
    item.addEventListener('dragstart', () => item.style.opacity = '0.4', false);
    item.addEventListener('dragend', (event) => {
        const divX = event.x - wsDiv.getBoundingClientRect().left
        const divY = event.y - wsDiv.getBoundingClientRect().top
        workspace.addComponent(item.id, divX, divY)

        item.style.opacity = '1'
    }, false);
})

const render = () => {
    rendererWorkspace.render(workspace.container);
    requestAnimationFrame(render);
}
render();