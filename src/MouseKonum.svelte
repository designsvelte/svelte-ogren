<script lang="ts">
    let m = {
        x:0,
        y:0
    };

    const handleMouse = (e) => {
        m.x = e.clientX;
        m.y = e.clientY;
    }
</script>

<div on:mousemove={handleMouse}>
    x: {m.x} <br/>
    y: {m.y}
</div>
<style>
    div{
        width: 100%;
        height: 100%;
    }
</style>