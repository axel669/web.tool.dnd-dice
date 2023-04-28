<script>
    import {
        Button,
        Icon,
        Input,
        Paper,
        Screen,
        Text,
        Titlebar,

        Flex,
        Grid,

        handler$
    } from "@axel669/zephyr"

    import asuid from "@labyrinthos/asuid"

    export let close
    export let id = asuid()
    export let name = "Dice Set"
    export let set = []

    let updated = { id, name, set }

    let rollName = "Roll"
    let rollSet = ""

    const exit = handler$(close)
    const addRoll = handler$(
        () => {
            updated.set = [
                ...updated.set,
                { name: rollName, dice: rollSet }
            ]
            rollName = "Roll"
            rollSet = ""
        }
    )
    const removeRoll = handler$(
        (roll) => updated.set = updated.set.filter(
            (setRoll) => setRoll !== roll
        )
    )
</script>

<Screen width="min(640px, 100%)">
    <Paper card lprops={{ p: "0px", cross: "stretch" }}>
        <Titlebar slot="header" fill color="primary">
            <Text title slot="title">
                Set Maker
            </Text>
        </Titlebar>

        <Paper slot="content" lprops={{ cross: "stretch" }}>
            <Flex slot="header" cross="stretch">
                <Grid pad="0px" cols="1fr 1fr">
                    <Button color="danger" on:click={exit(null)} variant="outline">
                        Cancel
                    </Button>
                    <Button color="secondary" on:click={exit(updated)} variant="outline">
                        Save
                    </Button>
                </Grid>
                <Input.Text label="Set Name" bind:value={updated.name} color="primary" />

                <Grid pad="0px" cols="1fr 1fr">
                    <Input.Text label="Roll Name" bind:value={rollName} color="secondary" />
                    <Input.Text label="Dice" bind:value={rollSet} color="secondary" />
                </Grid>
                <Button color="secondary" on:click={addRoll()}>
                    Add Roll
                </Button>
            </Flex>

            {#each updated.set as info}
                <Paper card layout={Grid} lprops={{ cols: "48px 1fr" }}>
                    <Button color="danger" on:click={removeRoll(info)}>
                        <Icon name="x" />
                    </Button>
                    <Flex pad="0px">
                        <Text title>{info.name}</Text>
                        <Text subtitle>{info.dice}</Text>
                    </Flex>
                </Paper>
            {/each}
        </Paper>
    </Paper>
</Screen>
