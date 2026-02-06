import React from 'react'

type Field = { label: string; name: string; type?: string; placeholder?: string; filled?: boolean }

type FormValues = Record<string, string>

type Props = {
  title: string
  subtitle?: string
  submitLabel: string
  fields: Field[]
  onSubmit: (payload: FormValues) => Promise<void>
}

export default function AuthForm({ title, subtitle, submitLabel, fields, onSubmit }: Props) {
  const [form, setForm] = React.useState<FormValues>({})
  const [loading, setLoading] = React.useState(false)
  const [visible, setVisible] = React.useState<Record<string, boolean>>({})
  const handleChange = (name: string, v: string) => setForm((s) => ({ ...s, [name]: v }))

  const toggleVisible = (name: string) => setVisible((s) => ({ ...s, [name]: !s[name] }))

  return (
    <div className="card">
      <h1>{title}</h1>
      {subtitle && <p className="lead">{subtitle}</p>}
      <form autoComplete="off" onSubmit={async (e) => { e.preventDefault(); setLoading(true); await onSubmit(form); setLoading(false) }}>
        {fields.map((f) => (
          <div className="field" key={f.name}>
            <label className="label">{f.label}</label>
            <div className="input-wrapper">
              <input
                name={f.name}
                className={`input ${f.filled ? 'input--filled' : ''}`}
                placeholder={f.placeholder || ''}
                autoComplete={
                  f.name === 'email' ? 'email' :
                  f.type === 'password' && submitLabel.toLowerCase().includes('create') ? 'new-password' :
                  f.type === 'password' ? 'current-password' :
                  f.name === 'username' ? 'username' : 'off'
                }
                type={f.type === 'password' ? (visible[f.name] ? 'text' : 'password') : (f.type || 'text')}
                value={form[f.name] || ''}
                onChange={(e) => handleChange(f.name, e.target.value)}
              />
              {f.type === 'password' && (
                <button type="button" className="icon-btn" onClick={() => toggleVisible(f.name)} aria-label="toggle visibility">
                  {visible[f.name] ? (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l18 18" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.58 10.59a3 3 0 004.24 4.24" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" stroke="#4b5563" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="#4b5563" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 8 }}>
          <button className={`btn ${submitLabel.toLowerCase().includes('create') ? 'btn-green' : 'btn-primary'}`} type="submit" disabled={loading}>{loading ? 'Please wait...' : submitLabel}</button>
        </div>
      </form>
    </div>
  )
}
