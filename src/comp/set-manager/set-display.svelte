<script>
    import {
        Button,
        EntryButton,
        Icon,
        Paper,
        Screen,
        Text,
        Titlebar,

        Flex,
        Grid,

        handler$
    } from "@axel669/zephyr"

    import { createEventDispatcher } from "svelte"

    export let set
    export let builtin = false

    const send = handler$(createEventDispatcher())
</script>

<Paper card>
    <Titlebar slot="header">
        <Text title slot="title">
            {set.name}
        </Text>

        <Button
            color="secondary"
            slot="menu"
            compact
            t-sz="&text-size-title"
            on:click={send("pick")}
            >
            <Icon name="selector" />
        </Button>

        <Flex direction="row" pad="0px" slot="action" cross="stretch">
            {#if builtin === false}
                <Button
                    color="danger"
                    compact
                    t-sz="&text-size-title"
                    on:click={send("remove")}
                    >
                    <Icon name="x" />
                </Button>
                <Button
                    color="primary"
                    compact
                    t-sz="&text-size-title"
                    on:click={send("edit")}
                    >
                    <Icon name="edit" />
                </Button>
            {/if}
        </Flex>
    </Titlebar>

    <Text>
        {set.set.map(d => d.name).join(", ")}
    </Text>
</Paper>
