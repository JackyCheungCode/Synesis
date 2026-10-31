import React, { useState } from 'react';

type AnyProps = Record<string, any> & { children?: React.ReactNode; className?: string };
const cx=(...v:any[])=>v.filter(Boolean).join(' ');
export function Button({children,kind='primary',size='md',renderIcon:Icon,disabled,onClick,type='button',className,...rest}:AnyProps){return <button {...rest} type={type} className={cx('sn-button','sn-button--'+kind,'sn-button--'+size,className)} disabled={disabled} onClick={onClick}>{Icon&&<Icon aria-hidden="true"/>}{children}</button>}
function Field({id,labelText,helperText,invalid,invalidText,children,className}:AnyProps){return <div className={cx('sn-field',className)}>{labelText&&<label htmlFor={id}>{labelText}</label>}{children}{helperText&&<small>{helperText}</small>}{invalid&&invalidText&&<small className="sn-error">{invalidText}</small>}</div>}
export function TextInput({id,labelText,value,onChange,type='text',invalid,invalidText,helperText,...p}:AnyProps){return <Field id={id} labelText={labelText} invalid={invalid} invalidText={invalidText} helperText={helperText}><input id={id} type={type} value={value??''} onChange={onChange} {...p}/></Field>}
export function PasswordInput(p:AnyProps){return <TextInput {...p} type="password"/>}
export function TextArea({id,labelText,value,onChange,...p}:AnyProps){return <Field id={id} labelText={labelText}><textarea id={id} value={value??''} onChange={onChange} {...p}/></Field>}
export function Tile({children,className,...p}:AnyProps){return <section className={cx('sn-surface',className)} {...p}>{children}</section>}
export function Grid({children,className,...p}:AnyProps){return <div className={cx('sn-grid',className)} {...p}>{children}</div>}
export function Column({children,className,...p}:AnyProps){return <div className={cx('sn-grid-item',className)} {...p}>{children}</div>}
export function Tag({children,type='neutral',className,...p}:AnyProps){return <span className={cx('sn-tag','sn-tag--'+type,className)} {...p}>{children}</span>}
export function InlineLoading({description='处理中'}:AnyProps){return <span className="sn-inline-loading" role="status"><i/>{description}</span>}
export function Loading({description='处理中'}:AnyProps){return <div className="sn-loading" role="status"><i/>{description}</div>}
export function InlineNotification({kind='info',title,subtitle,onCloseButtonClick}:AnyProps){return <div className={'sn-notice sn-notice--'+kind} role={kind==='error'?'alert':'status'}><div><b>{title}</b><p>{subtitle}</p></div><button type="button" aria-label="关闭通知" onClick={onCloseButtonClick}>×</button></div>}
export function NumberInput({id,label,min,max,step=1,value,onChange,helperText}:AnyProps){return <Field id={id} labelText={label} helperText={helperText}><input id={id} type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange?.(e,{value:e.target.value})}/></Field>}
export function RadioButtonGroup({name,legendText,valueSelected,onChange,children}:AnyProps){return <fieldset className="sn-radio-group"><legend>{legendText}</legend><div>{React.Children.map(children,(child:any)=>React.isValidElement(child)?React.cloneElement(child as React.ReactElement<any>,{name,checked:child.props.value===valueSelected,onChange:()=>onChange?.(child.props.value)}):child)}</div></fieldset>}
export function RadioButton({id,value,labelText,checked,onChange}:AnyProps){return <label className="sn-choice"><input id={id} type="radio" value={value} checked={!!checked} onChange={onChange}/><span>{labelText}</span></label>}
export function Checkbox({id,labelText,checked,onChange}:AnyProps){return <label className="sn-choice"><input id={id} type="checkbox" checked={!!checked} onChange={e=>onChange?.(e.target.checked)}/><span>{labelText}</span></label>}
export function Select({id,labelText,value,onChange,children,disabled}:AnyProps){return <Field id={id} labelText={labelText}><select id={id} value={value} onChange={onChange} disabled={disabled}>{children}</select></Field>}
export function SelectItem({value,text,children}:AnyProps){return <option value={value}>{text??children}</option>}
export function Link({href,children,...p}:AnyProps){return <a href={href} {...p}>{children}</a>}
export function ProgressIndicator({children,currentIndex,className}:AnyProps){return <ol className={cx('sn-progress',className)} data-current={currentIndex}>{children}</ol>}
export function ProgressStep({label,description,complete,current,disabled}:AnyProps){return <li className={cx(complete&&'is-complete',current&&'is-current',disabled&&'is-disabled')}><span className="sn-progress-dot"/><b>{label}</b><small>{description}</small></li>}
export function ProgressBar({value,label}:AnyProps){return <div className="sn-progressbar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}><span style={{width:(value??0)+'%'}}/></div>}
export function Tabs({children}:AnyProps){return <div className="sn-tabs">{children}</div>}
export function TabList({children}:AnyProps){return <div className="sn-tab-list" role="tablist">{children}</div>}
export function Tab({children,selected,onClick}:AnyProps){return <button type="button" role="tab" aria-selected={!!selected} onClick={onClick}>{children}</button>}
export function TabPanels({children}:AnyProps){return <div>{children}</div>}
export function TabPanel({children}:AnyProps){return <section role="tabpanel">{children}</section>}
export function Accordion({children}:AnyProps){return <div className="sn-accordion">{children}</div>}
export function AccordionItem({title,children}:AnyProps){return <details><summary>{title}</summary><div>{children}</div></details>}
export function FluidForm({children,...p}:AnyProps){return <form {...p}>{children}</form>}
export function FormGroup({children,legendText}:AnyProps){return <fieldset className="sn-form-group"><legend>{legendText}</legend>{children}</fieldset>}
export function FluidTextInput(p:AnyProps){return <TextInput {...p}/>}
export function FluidTextArea(p:AnyProps){return <TextArea {...p}/>}
export function FluidDropdown({id,label,items=[],selectedItem,onChange}:AnyProps){return <Field id={id} labelText={label}><select id={id} value={selectedItem?.id??''} onChange={e=>onChange?.(items.find((x:any)=>x.id===e.target.value)??null)}>{items.map((x:any)=><option key={x.id} value={x.id}>{x.text}</option>)}</select></Field>}
export function FluidMultiSelect({id,label,items=[],initialSelectedItems=[],onChange}:AnyProps){return <Field id={id} labelText={label}><select id={id} multiple value={initialSelectedItems.map((x:any)=>x.id)} onChange={e=>onChange?.(Array.from(e.target.selectedOptions).map(o=>items.find((x:any)=>x.id===o.value)).filter(Boolean))}>{items.map((x:any)=><option key={x.id} value={x.id}>{x.text}</option>)}</select></Field>}
export function FluidComboBox({id,label,items=[],selectedItem,onChange}:AnyProps){return <FluidDropdown id={id} label={label} items={items} selectedItem={selectedItem} onChange={onChange}/>}
export function FluidNumberInput({id,label,value,onChange,min,max,step}:AnyProps){return <NumberInput id={id} label={label} value={value} min={min} max={max} step={step} onChange={onChange}/>}
export function Header({children}:AnyProps){return <header className="sn-topbar">{children}</header>}
export function HeaderMenuButton({onClick,isActive,...p}:AnyProps){return <button type="button" className="sn-menu-trigger" onClick={onClick} aria-expanded={isActive} {...p}>☰</button>}
export function HeaderName({children,href}:AnyProps){return <a className="sn-brand" href={href}>{children}</a>}
export function HeaderGlobalBar({children}:AnyProps){return <div className="sn-top-actions">{children}</div>}
export function HeaderGlobalAction({children,onClick,...p}:AnyProps){return <button type="button" className="sn-icon-button" onClick={onClick} {...p}>{children}</button>}
export function Content({children,...p}:AnyProps){return <main {...p}>{children}</main>}
export function Breadcrumb({children}:AnyProps){return <nav aria-label="面包屑"><ol className="sn-breadcrumb">{children}</ol></nav>}
export function BreadcrumbItem({children,href,isCurrentPage}:AnyProps){return <li>{href?<a href={href}>{children}</a>:<span aria-current={isCurrentPage?'page':undefined}>{children}</span>}</li>}
export function Modal({open,modalHeading,children,onRequestClose,onRequestSubmit,onSecondarySubmit,primaryButtonText='确认',secondaryButtonText,primaryButtonDisabled,passiveModal}:AnyProps){if(!open)return null;return <div className="sn-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onRequestClose?.()}}><section className="sn-modal" role="dialog" aria-modal="true" aria-label={modalHeading}><header><h2>{modalHeading}</h2><button type="button" onClick={onRequestClose} aria-label="关闭">×</button></header><div className="sn-modal-body">{children}</div>{!passiveModal&&<footer>{secondaryButtonText&&<Button kind="quiet" onClick={onSecondarySubmit??onRequestClose}>{secondaryButtonText}</Button>}<Button disabled={primaryButtonDisabled} onClick={onRequestSubmit}>{primaryButtonText}</Button></footer>}</section></div>}
export function LineChart({data}:AnyProps){return <div className="sn-chart" role="img" aria-label="趋势图"><svg viewBox="0 0 600 180" preserveAspectRatio="none"><path d="M0 145 C80 120 100 60 180 92 S300 130 380 55 S500 85 600 20" fill="none" stroke="currentColor" strokeWidth="3"/></svg></div>}
export function DonutChart({data}:AnyProps){return <div className="sn-donut-chart" role="img" aria-label="构成图"><div/></div>}
