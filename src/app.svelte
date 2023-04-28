<script>
    import {
        Button,
        EntryButton,
        Icon,
        Paper,
        Screen,
        Select,
        Text,
        Titlebar,

        Grid,

        wsx,
    } from "@axel669/zephyr"

    import Dice from "$/comp/dice.svelte"
    import Result from "$/comp/result.svelte"
    import SetManager, { defaultDice } from "$/comp/set-manager.svelte"

    import rolls from "$rolls"

    let dice = defaultDice
    const updateSet = (evt) => dice = evt.detail

    const options = [
        { label: "Standard Dice", value: "" },
        { label: "Fancy", value: "fancyid" },
    ]

    $: managerProps = { current: dice }
</script>

<svelte:body use:wsx={{ theme: "tron", "@app": true }} />

<Screen width="min(640px, 100%)">
    <Paper card square lprops={{ p: "0px" }}>
        <Titlebar slot="header" fill color="primary">
            <Text title slot="title">
                D&D Dice Roller
            </Text>
        </Titlebar>

        <Paper slot="content" lprops={{ p: "0px", cross: "stretch" }} scrollable>
            <Grid slot="header">
                <EntryButton
                color="secondary"
                variant="fill"
                component={SetManager}
                props={managerProps}
                on:entry={updateSet}
                >
                    Roll Set: {dice.name}
                </EntryButton>
            </Grid>

            <Grid cols="1fr 1fr 1fr" autoRow="48px">
                {#each dice.set as info}
                    <Dice {info} />
                {/each}
            </Grid>
        </Paper>

        <Paper slot="footer" h="50vh" scrollable
        lprops={{ cross: "stretch", p: "0px" }}>
            <Titlebar slot="header" fill color="secondary">
                <Text title slot="title">
                    History
                </Text>

                <Button color={false} on:click={rolls.clear} slot="action">
                    Clear
                </Button>
            </Titlebar>

            {#each $rolls as info (info)}
                <Result {info} />
            {/each}
        </Paper>
    </Paper>
</Screen>
