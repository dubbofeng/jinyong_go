import { RpgClient } from '@rpgjs/client';
import RpgClientEngine from '../../src/rpg/client/index.ts';

// 创建RPG客户端实例
const client = new RpgClient({
    modules: [RpgClientEngine],
    canvas: {
        width: 800,
        height: 600,
        transparent: false,
        backgroundColor: 0x2a2a2a
    },
    inputs: {
        up: {
            repeat: true,
            bind: ['up', 'w', 'z'] // 上
        },
        down: {
            repeat: true,
            bind: ['down', 's'] // 下
        },
        left: {
            repeat: true,
            bind: ['left', 'a', 'q'] // 左
        },
        right: {
            repeat: true,
            bind: ['right', 'd'] // 右
        },
        action: {
            bind: 'space' // 交互键
        },
        back: {
            bind: 'escape' // 返回键
        }
    }
});

// 挂载到页面
const container = document.getElementById('game-container');
if (container) {
    container.appendChild(client.canvas);
}

// 启动游戏
client.start();

console.log('RPG Game initialized!');
