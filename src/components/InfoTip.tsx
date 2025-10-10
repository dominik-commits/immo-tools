import React from 'react'

export default function InfoTip({ text }: { text: string }) {
  return (
    <span title={text} style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:16, height:16, borderRadius:999, marginLeft:6,
      fontSize:11, lineHeight:'16px', border:'1px solid #ccc', color:'#555', cursor:'help'
    }}>?</span>
  )
}
