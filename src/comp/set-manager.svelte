<script context="module">
    const defaultDice = {
        id: "blep",
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

    export { defaultDice }
</script>

<script>
    import {
        Button,
        EntryButton,
        Icon,
        Paper,
        Screen,
        Text,
        Titlebar,

        Grid,

        handler$,
        eventHandler$,
    } from "@axel669/zephyr"

    import SetMaker from "./set-manager/set-maker.svelte"
    import Display from "./set-manager/set-display.svelte"

    export let close
    export let current

    let sets = JSON.parse(localStorage.sets ?? "[]")

    const exit = handler$(close)
    const add = eventHandler$(
        (evt) => {
            if (evt.detail === null) {
                return
            }
            sets = [...sets, evt.detail]
        }
    )
    const remove = handler$(
        (set) => {
            sets = sets.filter(
                s => s !== set
            )
            if (current.id !== set.id) {
                return
            }
            current = defaultDice
        }
    )

    $: localStorage.sets = JSON.stringify(sets)
</script>

<Screen width="min(640px, 100%)">
    <Paper card>
        <Titlebar slot="header" fill color="primary">
            <Text title slot="title">
                Set Manager
            </Text>
        </Titlebar>

        <Paper slot="content" scrollable lprops={{ cross: "stretch" }}>
            <Grid slot="header" cols="1fr 1fr">
                <Button color="danger" variant="outline" on:click={exit(current)}>
                    Cancel
                </Button>

                <EntryButton
                variant="outline"
                color="secondary"
                component={SetMaker}
                props={{}}
                on:entry={add()}
                >
                    <Icon name="plus">Add Set</Icon>
                </EntryButton>
            </Grid>

            <Display set={defaultDice} builtin on:pick={exit(defaultDice)} />
            {#each sets as set (set.id)}
                <Display
                    {set}
                    on:pick={exit(set)}
                    on:remove={remove(set)}
                />
            {/each}
        </Paper>
    </Paper>
</Screen>
