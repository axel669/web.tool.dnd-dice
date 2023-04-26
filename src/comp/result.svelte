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
    const colors = ["transparent", "&secondary-ripple"]
</script>

<Grid cols="160px min-content 1fr" bg={colors[info.i]}>
    <Text t-a="center">{info.name}</Text>
    <Text t-sz="&text-size-info">{info.dice}</Text>

    <div ws-x="col[2] row[1/3] bg[&secondary] w[3px]" />

    <Text title t-a="center">{info.total}</Text>
    <Text t-sz="&text-size-info">{info.values}</Text>
</Grid>
