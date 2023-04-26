const randResult = new Uint32Array(1)
const rand = (sides) => {
    crypto.getRandomValues(randResult)
    const rand = randResult[0] / 0xffffffff
    const roll = Math.floor(rand * sides) + 1

    return roll
}

export default rand
