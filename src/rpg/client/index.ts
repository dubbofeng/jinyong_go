import { RpgModule, RpgClient } from '@rpgjs/client'

@RpgModule({
    engine: {
        onStart(client: RpgClient) {
            console.log('RPG Client started!')
        }
    }
})
export default class RpgClientEngine {}
