<script>
    import {
        Paper,
        Titlebar,
        Text,
        Grid,
        Flex,
        wsx,
    } from "@axel669/zephyr"

    export let info
    const colors = ["transparent", "&primary-ripple"]

    const cols = "130px min-content 1fr 1fr"
</script>

<Grid {cols} rows="1fr 1fr" bg={colors[info.i]} gr-flow="column">
    <Text t-a="center">
        {info.name}
    </Text>
    <Text title t-a="center">
        {info.total}
    </Text>

    <div ws-x="col[2] row[1/3] bg[&primary] w[3px]" />

    <Text t-sz="&text-size-info" col="3" row="1/3">
        <Text block>
            untyped: {info.untyped}
        </Text>
        {#each info.typed as [type, dmg]}
            <Text block>
                {type}: {dmg}
            </Text>
        {/each}
    </Text>

    <Text t-sz="&text-size-info">
        {info.dice}
    </Text>
    <Text t-sz="&text-size-info">
        {#each info.rolls as [dmg], i}
            {#if i != 0} + {/if}
            {dmg}
        {/each}
    </Text>
</Grid>
