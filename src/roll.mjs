import rand from "./rand.mjs"

const diceRegex = /(?<num>\d+)?d(?<sides>\d+)(\((?<type>\w+)\))?(\[(?<mods>[a-z]+)\])?|(?<value>\d+)(\((?<valuetype>\w+)\))?/g
const parse = (rolls) => Array.from(
    rolls.matchAll(diceRegex),
    (match) => ({
        value: parseInt(match.groups.value ?? "-1"),
        num: parseInt(match.groups.num ?? "1"),
        sides: parseInt(match.groups.sides ?? "-1"),
        type: match.groups.type ?? "",
        valuetype: match.groups.valuetype ?? "",
        mods: match.groups.mods,
    })
)

const mods = {
    a: (values) => [Math.max(...values)],
    d: (values) => [Math.min(...values)],
}
const roller = (info) => {
    if (info.value !== -1) {
        return [info.value, info.valuetype]
    }

    const values = Array.from(
        { length: info.num },
        () => rand(info.sides)
    )

    const modified = [...(info.mods ?? "")].reduce(
        (values, mod) => mods[mod](values),
        values
    )

    const total = modified.reduce(
        (total, n) => total + n,
        0
    )

    return [total, info.type]
}

const add = (a = 0, b = 0) => a + b
const roll = (dice) => {
    const rolls = parse(dice).map(
        (info) => roller(info)
    )

    const totals = rolls.reduce(
        (totals, roll) => {
            totals["?"] = add(totals["?"], roll[0])
            totals[roll[1]] = add(totals[roll[1]], roll[0])
            return totals
        },
        {}
    )
    const {
        "?": total,
        "": untyped,
        ...typed
    } = totals

    return { rolls, total, untyped, typed: Object.entries(typed) }
}

export default roll
