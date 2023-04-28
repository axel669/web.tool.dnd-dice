import { writable } from "svelte/store"

const defaultDice = {
    name: "Standard Dice",
    set: [
        { name: "D4", dice: "d4" },
        { name: "D6", dice: "d6" },
        { name: "D8", dice: "d8" },
        { name: "D10", dice: "d10" },
        { name: "D12", dice: "d12" },
        { name: "D20", dice: "d20" },
        { name: "D100", dice: "d100" },
    ]
}
const source = writable(defaultDice)

export default {
    subscribe: source.subscribe
}
