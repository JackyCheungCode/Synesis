import { useMemo, useState } from 'react';
import { MultiSelect } from './MultiSelect';

type SchemaField = {
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  required?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  format?: string;
  editor?: string;
  items?: { type?: string; enum?: unknown[]; title?: string };
  properties?: Record<string, SchemaField>;
  readOnly?: boolean;
};
type InputSchema = { properties?: Record<string, SchemaField>; required?: string[] };
type Props = {
  schema: InputSchema | null | undefined;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  schemaError?: string;
};
const labels: Record<string, string> = {
  searchType: '搜索类型', searchQuery: '搜索内容', startUrls: '起始页面 URL',
  watchConsignees: '监控进口商 / 收货人', watchShippers: '监控供应商 / 发货人',
  watchHsCodes: '监控 HS Code', productKeywords: '产品关键词', country: '目标国家',
  maxLeads: '最大线索数量', maxResults: '最大结果数量', sector: '行业 / 领域',
  enrichEmails: '补充邮箱', verifyEmails: '验证邮箱', enrichSocials: '补充社交资料',
  outputFormat: '输出格式', proxyUrl: '代理 URL',
};
const splitList = (value: string) => value.split(/[\\n,，;；]+/).map(item => item.trim()).filter(Boolean);
function fieldType(field: SchemaField): string {
  const type = Array.isArray(field.type) ? field.type.find(item => item !== 'null') : field.type;
  if (type) return type;
  if (field.enum) return 'string';
  if (field.properties) return 'object';
  return 'string';
}
function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
  return value === undefined || value === null ? '' : String(value);
}
export function DynamicActorForm({ schema, schemaError, value, onChange }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [objectDrafts, setObjectDrafts] = useState<Record<string, string>>({});
  const properties = schema?.properties ?? {};
  const required = schema?.required ?? [];
  const fields = useMemo(() => Object.entries(properties).map(([key, definition]) => ({
    key, definition, type: fieldType(definition), required: required.includes(key),
  })), [properties, required]);
  const basic = fields.filter(({ key, definition, type }) =>
    !definition.readOnly && !definition.editor?.toLowerCase().includes('json') &&
    !['array', 'object'].includes(type) && !/proxy|cookie|session|debug|advanced|webhook/i.test(key));
  const advanced = fields.filter(({ key, definition }) =>
    !definition.readOnly && !basic.some(item => item.key === key));
  const update = (key: string, next: unknown) => {
    const copy = { ...value };
    if (next === undefined || next === '') delete copy[key];
    else copy[key] = next;
    onChange(copy);
  };
  const renderField = ({ key, definition, type, required: isRequired }: typeof fields[number]) => {
    const label = definition.title || labels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
    const current = value[key] ?? definition.default;
    const common = { id: `actor-field-${key}`, name: key, disabled: definition.readOnly === true };
    return <label className="leads-field actor-dynamic-field" key={key} htmlFor={common.id}>
      <span>{label}{isRequired && <b> *</b>}<small className="actor-schema-key">{key}</small></span>
      {type === 'boolean' ? <span className="actor-boolean-control">
        <input {...common} type="checkbox" checked={Boolean(current)} onChange={event => update(key, event.target.checked)} />
        <span>{Boolean(current) ? '启用' : '关闭'}</span>
      </span> :
      Array.isArray(definition.enum) ? <select {...common} value={displayValue(current)} onChange={event => {
        const option = definition.enum?.find(item => String(item) === event.target.value);
        update(key, option);
      }}>
        {!isRequired && <option value="">请选择</option>}
        {definition.enum.map(option => <option key={String(option)} value={String(option)}>{String(option)}</option>)}
      </select> :
      type === 'integer' || type === 'number' ? <input {...common} type="number" step={type === 'integer' ? 1 : 'any'}
        min={definition.minimum} max={definition.maximum} value={displayValue(current)}
        onChange={event => update(key, event.target.value === '' ? undefined : Number(event.target.value))} /> :
      type === 'array' && Array.isArray(definition.items?.enum) ? <MultiSelect label={label} value={Array.isArray(current) ? current.map(String) : []} options={(definition.items?.enum ?? []).map(option => ({ value: String(option), label: String(option) }))} onChange={selected => update(key, selected.map(item => definition.items?.enum?.find(option => String(option) === item) ?? item))} placeholder="搜索并多选…" /> :
      type === 'array' && definition.items?.type === 'string' ? <textarea {...common} rows={3}
        value={displayValue(current)} placeholder="多个值请用逗号或换行分隔"
        onChange={event => update(key, splitList(event.target.value))} /> :
      type === 'array' ? <textarea {...common} rows={4} spellCheck={false}
        value={objectDrafts[key] ?? displayValue(current)}
        placeholder={'输入 JSON 数组，例如：["https://example.com"]'}
        onChange={event => {
          setObjectDrafts(previous => ({ ...previous, [key]: event.target.value }));
          try { const parsed = JSON.parse(event.target.value); if (Array.isArray(parsed)) update(key, parsed); } catch { /* Keep the draft until valid JSON is entered. */ }
        }} /> :
      type === 'object' ? <textarea {...common} rows={4} spellCheck={false}
        value={objectDrafts[key] ?? displayValue(current)}
        placeholder="输入 JSON 对象"
        onChange={event => {
          setObjectDrafts(previous => ({ ...previous, [key]: event.target.value }));
          try { const parsed = JSON.parse(event.target.value); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) update(key, parsed); } catch { /* Keep the draft until valid JSON is entered. */ }
        }} /> :
      <input {...common} type={definition.format === 'date' ? 'date' : definition.format === 'uri' || definition.format === 'url' ? 'url' : definition.format === 'email' ? 'email' : 'text'}
        minLength={definition.minLength} maxLength={definition.maxLength}
        value={displayValue(current)} onChange={event => update(key, event.target.value)} />}
      {definition.description && <small className="actor-field-description">{definition.description}</small>}
      {(definition.minimum !== undefined || definition.maximum !== undefined || definition.minLength !== undefined || definition.maxLength !== undefined) &&
        <small className="actor-field-hint">{definition.minimum !== undefined ? `最小值 ${definition.minimum} ` : ''}{definition.maximum !== undefined ? `最大值 ${definition.maximum} ` : ''}{definition.minLength !== undefined ? `最少 ${definition.minLength} 字符 ` : ''}{definition.maxLength !== undefined ? `最多 ${definition.maxLength} 字符` : ''}</small>}
    </label>;
  };
  if (!schema || !schema.properties || !fields.length) return <div className="leads-empty">{schemaError || '该 Actor 没有公开可读取的 Input Schema。你仍可切换到高级 JSON 输入，并由 Apify 在启动时验证参数。'}</div>;
  return <div className="actor-dynamic-form">
    <div className="actor-form-section"><div className="actor-form-section-title"><b>基本参数</b><span>{basic.length} 个字段</span></div>
      <div className="leads-field-grid">{basic.map(renderField)}</div>
    </div>
    {advanced.length > 0 && <div className="actor-advanced-section">
      <button type="button" className="leads-back-link actor-advanced-toggle" onClick={() => setAdvancedOpen(open => !open)}>
        {advancedOpen ? '收起高级参数' : `展开高级参数（${advanced.length}）`} <span>{advancedOpen ? '−' : '+'}</span>
      </button>
      {advancedOpen && <div className="leads-field-grid">{advanced.map(renderField)}</div>}
    </div>}
  </div>;
}
