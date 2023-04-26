<script>
    import {
        Button,
        Modal,
        handler$,
    } from "@axel669/zephyr"

    import rand from "$/rand.mjs"
    import rolls from "$rolls"

    export let sides

    let value = 0
    const roll = handler$(
        () => {
            const value = rand(sides)
            rolls.add({
                name: `d${sides}`,
                dice: `d${sides}`,
                values: value.toString(),
                total: value,
            })
        }
    )
</script>

<Button variant="outline" color="primary" on:click={roll()}>
    d{sides}
</Button>
