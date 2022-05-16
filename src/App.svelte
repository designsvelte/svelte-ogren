<script lang="ts">

	import SayiArttir  from "./Say.svelte"
	import MouseKonum from "./MouseKonum.svelte"
	import Urunler from "./Urunler.svelte"

	let color;
	   let mainStyle = `border:2px solid pink; 
                    padding: 20px;
                    margin 0 auto; 
                    width:500px;`;
</script>
	<main style={mainStyle}>
		<Urunler />
		<div style="height: 80px;">
			<MouseKonum />
		</div>
		<input type="text" bind:value={color} placeholder="İnglizce renk girin 'red' gibi">
		<SayiArttir renk={color}/>
	</main>
	
		

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 340px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	input{
		width: 90%;
	}
	input::placeholder{
		color:rgba(108, 106, 106, 0.572);
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>