<script>
    import { Dialog } from "@axel669/zephyr"

    export let close
    export let n

    export const cancel = () => close(null)
</script>

<Dialog outline>
    <div ws-x="$adorn w[64px] h[64px] t-sz[24px]">
        {n}
    </div>
</Dialog>
