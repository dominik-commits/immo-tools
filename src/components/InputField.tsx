import React from 'react'

type Props = {
  label: React.ReactNode
  value: number | string
  onChange: (v: string) => void
  hint?: string
  suffix?: string
  step?: string | number
  required?: boolean
}

export default function InputField({
  label, value, onChange, hint, suffix, step, required
}: Props) {
  return (
    <label style={{display:'block', marginBottom:12}}>
      <div style={{fontSize:13, fontWeight:600, marginBottom:6}}>
        {label} {required && <span style={{color:'#c00'}}>*</span>}
      </div>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <input
          className="btn"
          type="number"
          step={step ?? 'any'}
          value={value}
          onChange={(e)=>onChange(e.target.value)}
          style={{width:'100%'}}
          required={required}
        />
        {suffix && <span className="muted">{suffix}</span>}
      </div>
      {hint && <div className="muted" style={{marginTop:4}}>{hint}</div>}
    </label>
  )
}

