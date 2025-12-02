import ASSETS from './assets.js';

export default {
    'explosion': 
    {
        key: 'explosion',
        texture: ASSETS.spritesheet.tiles.key,
        frameRate: 10,
        config: { start: 4, end: 8 },
    },
    'rabbit-walk':
    {
        key: 'rabbit-walk',
        texture: ASSETS.spritesheet.rabbit.key,
        frameRate: 30,
        config: { start: 9, end: 12},
    },
    'fox-walk':
    {
        key: 'fox-walk',
        texture: ASSETS.spritesheet.fox.key,
        frameRate: 30,
        config: { start: 3, end: 5},
    },
};