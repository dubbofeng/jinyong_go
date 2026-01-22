import { RpgModule, RpgServer } from '@rpgjs/server'

@RpgModule({
    engine: {
        onStart(server: RpgServer) {
            console.log('RPG Server started!')
        }
    }
})
export default class RpgServerEngine {}
