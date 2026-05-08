import { useState } from 'react'
import { removeBackground } from '@imgly/background-removal'

export default function Home(){
  const [image,setImage]=useState(null)
  const [result,setResult]=useState(null)
  const [loading,setLoading]=useState(false)

  async function handleFile(e){
    const file=e.target.files[0]
    if(!file) return
    setImage(URL.createObjectURL(file))

    setLoading(true)
    const blob=await removeBackground(file)
    const url=URL.createObjectURL(blob)
    setResult(url)
    setLoading(false)
  }

  return (
    <div style={{fontFamily:'sans-serif',padding:40}}>
      <h1>Sticker Generator</h1>

      <input type="file" accept="image/*" onChange={handleFile}/>

      {loading && <p>Generating sticker...</p>}

      {result && (
        <div>
          <h3>Sticker</h3>
          <img src={result} style={{maxWidth:300}}/>
          <br/>
          <a href={result} download="sticker.png">Download Sticker</a>
        </div>
      )}
    </div>
  )
}
