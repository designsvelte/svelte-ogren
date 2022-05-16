<script lang="ts">

    let id:number 
    let title = ''
    let completed = false
    $: id = todos.length+1;
    let durum:boolean = null;
    $: durum = todos.length > 10  ? false : true;
    let kaybol;
   
    let todos = [
            {
                "id": 1,
                "title": "delectus aut autem",
                "completed": false
            },
            {
                "id": 2,
                "title": "quis ut nam facilis et officia qui",
                "completed": false
            },
            {
                "id": 3,
                "title": "fugiat veniam minus",
                "completed": false
            },
            {
                "id": 4,
                "title": "et porro tempora",
                "completed": true
            },
            {
                "id": 5,
                "title": "laboriosam mollitia et enim quasi adipisci quia provident illum",
                "completed": false
            }
    ];

    const handleSubmit = async () => {
       
        if (todos.length<10) {
            let newTodo = { id, title, completed };
            todos = [...todos, newTodo ]
            clearInputs();     
        } else {
            durum=false
        }

    
    }

    function clearInputs(){
        title = '';
        completed = false;
        kaybol= 'Tamam'
        setTimeout(() => {
            kaybol = '';
        }, 600);
    }
    function girisMesaji(renk, mesaj){
           return `<div style="background:${renk}; color:white; padding:15px">${mesaj}</div>`
    }
</script>

<table>
    <tr>
        <th>id</th>
        <th>title</th>
        <th>completed</th>
    </tr>

        {#each todos as todo }
            <tr>
                <td>{todo.id}</td>
                <td>{todo.title}</td>
                <td><input type="checkbox" 
                    name="completed" id="completed"
                    checked={todo.completed}></td>
            </tr>
        {/each}
</table>
<form on:submit|preventDefault={handleSubmit}>
    <input type="text" bind:value={title} />
    <input type="checkbox" bind:checked={completed}/><br>
    <button disabled={title==''}>Kaydet</button>
</form>


    {#if (durum && kaybol === 'Tamam' )}
            {@html girisMesaji('green', 'Giriş başarılı')}
        {:else if durum==false}
            {@html girisMesaji('red', 'En çok 10 adet todo girilebilir')}
    {/if}

<style>
    td{
        text-align: justify;
    }
    td  input{
        width: 100%;
        text-align: center;
    }
</style>