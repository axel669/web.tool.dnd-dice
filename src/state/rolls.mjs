import { writable } from "svelte/store"

const source = writable([])

let i = 0
export default {
    subscribe: source.subscribe,
    add: (info) => source.update(
        (list) => {
            i = 1 - i
            return [
                { ...info, i },
                ...list.slice(0, 99)
            ]
        }
    ),
    clear: () => source.set([])
}
