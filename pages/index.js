import { useState, useRef } from 'react'
import { removeBackground } from '@imgly/background-removal'
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

export default function Home(){
  const [image,setImage]=useState(null)
  const [result,setResult]=useState(null)
  const [gallery,setGallery]=useState([])
  const [loading,setLoading]=useState(false)
  const [progress,setProgress]=useState(0)
  const [status,setStatus]=useState('')
  const [brightness,setBrightness]=useState(100)
  const [contrast,setContrast]=useState(100)
  const [cartoon,setCartoon]=useState(false)
  const canvasRef = useRef(null)
  const [model,setModel]=useState(null)

  async function handleFile(e){

    if(!model){
      setStatus('Loading AI model')
      const m = await cocoSsd.load()
      setModel(m)
    }
    const file=e.target.files[0]
    if(!file) return

    setLoading(true)
    setProgress(10)
    setStatus('Uploading image')

    await new Promise(r=>setTimeout(r,300))

    setProgress(30)
    setStatus('Removing background')

    const blob=await removeBackground(file)
    const url=URL.createObjectURL(blob)

    setProgress(55)
    setStatus('Detecting main subject')

    const img = new Image()

    img.onload = async () => {

      let crop = {x:0,y:0,w:img.width,h:img.height}

      if(model){
        const predictions = await model.detect(img)

        if(predictions && predictions.length>0){
          const best = predictions.sort((a,b)=>b.score-a.score)[0]
          const [x,y,w,h] = best.bbox
          crop = {x,y,w,h}
        }
      }

      setProgress(75)
      setStatus('Rendering sticker')

      drawImage(img,crop)

      setProgress(100)
      setStatus('Sticker ready')

      setTimeout(()=>{
        setLoading(false)
        setProgress(0)
        setStatus('')
      },600)
    }

    img.src = url

    setImage(url)
  }

  function drawImage(img,crop=null){
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const size = 512
    canvas.width = size
    canvas.height = size

    ctx.clearRect(0,0,size,size)

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`

    const srcW = crop ? crop.w : img.width
    const srcH = crop ? crop.h : img.height
    const srcX = crop ? crop.x : 0
    const srcY = crop ? crop.y : 0

    const scale = Math.min(size/srcW,size/srcH)
    const w = srcW*scale
    const h = srcH*scale

    const x = (size-w)/2
    const y = (size-h)/2

    if(cartoon){
      ctx.filter += ' saturate(160%)'
    }

    ctx.drawImage(img,srcX,srcY,srcW,srcH,x,y,w,h)

    drawOutline(ctx)

    const data = canvas.toDataURL('image/png')
    setResult(data)

    setGallery(prev=>{
      const updated=[data,...prev]
      return updated.slice(0,5)
    })
  }

  function drawOutline(ctx){
    const canvas = canvasRef.current
    const imageData = ctx.getImageData(0,0,canvas.width,canvas.height)
    const data = imageData.data

    for(let y=1;y<canvas.height-1;y++){
      for(let x=1;x<canvas.width-1;x++){
        const i=(y*canvas.width+x)*4
        const alpha=data[i+3]

        if(alpha>0){
          for(let oy=-3;oy<=3;oy++){
            for(let ox=-3;ox<=3;ox++){
              const ni=((y+oy)*canvas.width+(x+ox))*4
              if(data[ni+3]===0){
                data[ni]=255
                data[ni+1]=255
                data[ni+2]=255
                data[ni+3]=255
              }
            }
          }
        }
      }
    }

    ctx.putImageData(imageData,0,0)
  }

  function updateAdjustments(){
    if(!image) return
    const img = new Image()
    img.onload = () => drawImage(img)
    img.src = image
  }

  return (
    <div style={{fontFamily:'sans-serif',padding:40}}>
      <h1>Sticker Generator</h1>

      <input type="file" accept="image/*" onChange={handleFile}/>

      {loading && (
        <div style={{marginTop:20,maxWidth:400}}>
          <div style={{marginBottom:8,fontSize:14}}>{status}</div>
          <div style={{background:'#eee',borderRadius:6,overflow:'hidden',height:10}}>
            <div
              style={{
                width:`${progress}%`,
                height:'100%',
                background:'linear-gradient(90deg,#4facfe,#00f2fe)',
                transition:'width 0.4s ease'
              }}
            />
          </div>
        </div>
      )}

      {image && (
        <div style={{marginTop:20}}>
          <div>
            Brightness
            <input type="range" min="50" max="150" value={brightness}
            onChange={e=>{setBrightness(e.target.value);setTimeout(updateAdjustments,0)}} />
          </div>

          <div>
            Contrast
            <input type="range" min="50" max="150" value={contrast}
            onChange={e=>{setContrast(e.target.value);setTimeout(updateAdjustments,0)}} />
          </div>

          <div>
            Cartoonize
            <input type="checkbox" checked={cartoon}
            onChange={e=>{setCartoon(e.target.checked);setTimeout(updateAdjustments,0)}} />
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{display:'none'}} />

      {result && (
        <div>
          <h3>Sticker</h3>
          <img src={result} style={{maxWidth:300}}/>
          <br/>
          <a href={result} download="sticker.png">Download Sticker</a>
        </div>
      )}

      {gallery.length>0 && (
        <div style={{marginTop:40}}>
          <h3>Recent Stickers</h3>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            {gallery.map((img,i)=> (
              <img
                key={i}
                src={img}
                style={{width:90,height:90,objectFit:'contain',border:'1px solid #ddd',borderRadius:8,padding:4,cursor:'pointer'}}
                onClick={()=>setResult(img)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
