export default {
    // 'audio': {
    //     score: {
    //         key: 'sound',
    //         args: ['assets/sound.mp3', 'assets/sound.m4a', 'assets/sound.ogg']
    //     },
    // },
    // 'image': {
    //     spikes: {
    //         key: 'spikes',
    //         args: ['assets/spikes.png']
    //     },
    // },
    'spritesheet': {
        ships: {
            key: 'ships',
            args: ['assets/ships.png', {
                frameWidth: 64,
                frameHeight: 64,
            }]
        },
        tiles: {
            key: 'tiles',
            args: ['assets/tiles.png', {
                frameWidth: 32,
                frameHeight: 32
            }]
        },
        carrot: {
            key: 'carrot',
            args: ['assets/carrot.png', {
                frameWidth: 16,
                frameHeight: 16,
            }]
        },
        rabbit: {
            key: 'rabbit',
            args: ['assets/rabbit-sheet.png', {
                frameWidth: 44,
                frameHeight: 74,
            }]
        },
        fox: {
            key: 'fox',
            args: ['assets/fox-sheet.png', {
                frameWidth: 47,
                frameHeight: 63,
            }]
        },
    }
};