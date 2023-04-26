<script>
    import {
        Text,
        Screen,
        Paper,
        Titlebar,
        Grid,
        wsx,
    } from "@axel669/zephyr"

    import Dice from "$/comp/dice.svelte"
    import Result from "$/comp/result.svelte"

    import rolls from "$rolls"
</script>

<svelte:body use:wsx={{ theme: "tron", "@app": true }} />

<Screen width="min(640px, 100%)">
    <Paper card square lprops={{ p: "0px", cross: "stretch" }} scrollable>
        <Titlebar slot="header" fill color="primary">
            <Text title slot="title">
                D&D Dice Roller
            </Text>
        </Titlebar>

        <Grid cols="1fr 1fr 1fr" autoRow="48px">
            <Dice sides={4} />
            <Dice sides={6} />
            <Dice sides={8} />
            <Dice sides={10} />
            <Dice sides={12} />
            <Dice sides={20} />
            <Dice sides={100} />
        </Grid>

        <Paper slot="footer" h="50vh" scrollable
        lprops={{ cross: "stretch", p: "0px" }}>
            <Titlebar slot="header" fill color="secondary">
                <Text title slot="title">
                    History
                </Text>
            </Titlebar>

            {#each $rolls as info (info)}
                <Result {info} />
            {/each}
        </Paper>
    </Paper>
</Screen>
