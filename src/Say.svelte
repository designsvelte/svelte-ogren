<script lang="ts">
    let count = 0;
    export let renk: string;

    let isLogin : boolean = false;
    let durum: string = 'Login';

   const loginol = () => {
       if(isLogin){
            durum='Login'
            isLogin=false
       }else{
            durum='Logout'
            isLogin=true
       }
     
   }

   let cinsiyet = "Kız";
   let js_lib = ['React'];
   let mevsim_sec

   let reactivity_0 = 0;
   let reactivity_1 = 0;
   let carpim = 0;
   let bolum = 0;

   $: carpim = reactivity_0 * reactivity_1;
   $: bolum = reactivity_1 === 0 || (reactivity_0 === 0 && reactivity_1 === 0) ? 0 : reactivity_0 / reactivity_1;
    
</script>

<p style="color:{renk}">
    <strong>Say: {count}</strong>
</p>


<div>
    <button on:click={() => count++}>+</button>
    <button on:click={() => count--}>-</button>
    <button on:click|preventDefault={()=>(count=0)}>Reset</button><hr>
    <button on:click={loginol}>{durum}</button>
</div>

<p>
    {#if isLogin}
        Oturum açıldı
    {:else}
        Oturum sonlandırıldı
    {/if}
</p>

<p>
    <input type="radio" bind:group={cinsiyet} value="Kız"> Kız
    <input type="radio" bind:group={cinsiyet} value="Erkek"> Erkek
    <input type="radio" bind:group={cinsiyet} value="Belirtmek istemiyorum"> Belirtmek istemiyorum
</p>

<span>{cinsiyet}</span>
<hr>
<p>
    <input type="checkbox" bind:group={js_lib} value="Vue"> Vue
    <input type="checkbox" bind:group={js_lib} value="React"> React
    <input type="checkbox" bind:group={js_lib} value="Svelte"> Svelte
</p>
<span>{js_lib}</span>
<hr>
<p>
    <select name="aysec" id="aysec" bind:value={mevsim_sec}>
        <option value="Yaz">Yaz</option>
        <option value="İlkbahar">İlkbahar</option>
        <option value="Kış">Kış</option>
        <option value="Sonbahar">Sonbahar</option>
    </select>
</p>
<span>{mevsim_sec}</span>
<hr>
<h3>Reactivity</h3>
<div id="Reactivity">
    <small>Bir taraf değiştiğinde sonuç da değişir.</small>
</div>
	<input type="number" bind:value={reactivity_0}>
    <input type="number" bind:value={reactivity_1}>
    <p><b>Çarpım:</b> {carpim} - <b>Bölüm:</b> {bolum}</p>


<style>
    #Reactivity{
        padding-bottom: 10px;
    }
</style>
