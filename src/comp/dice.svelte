<script>
    import {
        Button,
        Flex,
        Modal,
        Text,
        handler$,
    } from "@axel669/zephyr"

    import rand from "$/rand"
    import rolls from "$rolls"
    import roll from "$/roll"

    export let info

    let value = 0
    const rollem = handler$(
        () => rolls.add({
            name: info.name,
            dice: info.dice,
            ...roll(info.dice),
        })
    )
</script>

<Button variant="outline" color="primary" on:click={rollem()}>
    <Flex cross="center" main="center">
        <Text>{info.name}</Text>
        <Text subtitle>{info.dice}</Text>
    </Flex>
</Button>
