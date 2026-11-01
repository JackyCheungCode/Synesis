import { useMemo, useState, type CSSProperties } from 'react';

export type SelectOption = { value: string; label: string; group?: string; flag?: string; logo?: string; logoColor?: string };
type MultiSelectProps = {
  label: string;
  value: string[];
  options: SelectOption[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
};

export function MultiSelect({ label, value, options, onChange, placeholder = '搜索并选择…', searchable = true }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.filter(option => value.includes(option.value));
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return options.filter(option => !needle || option.label.toLocaleLowerCase().includes(needle) || option.value.toLocaleLowerCase().includes(needle));
  }, [options, query]);
  const toggle = (item: SelectOption) => onChange(value.includes(item.value) ? value.filter(valueItem => valueItem !== item.value) : [...value, item.value]);
  const renderMark = (option: SelectOption) => option.flag
    ? <span className="sn-select-flag" aria-hidden="true">{option.flag}</span>
    : option.logo
      ? <span className="sn-select-logo" style={{ '--logo-color': option.logoColor || '#64748b' } as CSSProperties} aria-hidden="true"><img src={`https://cdn.simpleicons.org/${option.logo}/ffffff`} alt="" onError={event => { event.currentTarget.style.display = 'none'; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.style.opacity = '1'; }} /><span>{option.label.slice(0, 1)}</span></span>
      : null;
  return <div className="sn-multi-select">
    <span className="sn-multi-label">{label}</span>
    <button type="button" className={'sn-multi-trigger' + (open ? ' is-open' : '')} aria-expanded={open} onClick={() => setOpen(current => !current)}>
      <span className="sn-multi-summary">{selected.length ? <>{selected.slice(0, 3).map(option => <span className="sn-multi-chip" key={option.value}>{renderMark(option)}{option.label}</span>)}{selected.length > 3 && <span className="sn-multi-count">+{selected.length - 3}</span>}</> : <span className="sn-multi-placeholder">{placeholder}</span>}</span>
      <span className="sn-multi-trailing"><small>{selected.length ? `已选 ${selected.length}` : '多选'}</small><span className="sn-multi-chevron">⌄</span></span>
    </button>
    {open && <div className="sn-multi-popover">
      {searchable && <div className="sn-multi-search"><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="输入名称搜索…" aria-label={`搜索${label}`} /></div>}
      <div className="sn-multi-actions"><span>{filtered.length} 个选项</span><button type="button" onClick={() => onChange([])}>清空</button><button type="button" onClick={() => onChange(filtered.map(option => option.value))}>全选当前结果</button></div>
      <div className="sn-multi-options" role="listbox" aria-label={label} aria-multiselectable="true">
        {filtered.length ? filtered.map(option => <button type="button" role="option" aria-selected={value.includes(option.value)} className={'sn-multi-option' + (value.includes(option.value) ? ' is-selected' : '')} key={option.value} onClick={() => toggle(option)}>
          <span className="sn-multi-check">{value.includes(option.value) ? '✓' : ''}</span>{renderMark(option)}<span className="sn-multi-option-copy"><b>{option.label}</b>{option.group && <small>{option.group}</small>}</span>
        </button>) : <div className="sn-multi-empty">没有匹配的选项</div>}
      </div>
      <div className="sn-multi-footer"><span>已选择 {selected.length} 项</span><button type="button" onClick={() => { setOpen(false); setQuery(''); }}>完成</button></div>
    </div>}
    {selected.length > 0 && <div className="sn-multi-selected">{selected.map(option => <button type="button" key={option.value} onClick={() => toggle(option)} aria-label={`移除 ${option.label}`}>{renderMark(option)}<span>{option.label}</span><i>×</i></button>)}</div>}
  </div>;
}

const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
const regionNames = new Intl.DisplayNames(['zh-TW'], { type: 'region' });
const flagFor = (code: string) => String.fromCodePoint(...code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0)));
export const countryOptions: SelectOption[] = countryCodes.map(code => ({ value: regionNames.of(code) || code, label: regionNames.of(code) || code, flag: flagFor(code) })).sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
const languageCodes = 'ar bn bg ca cs da de el en es et fa fi fil fr gu he hi hr hu id it ja jv ka kk km kn ko lo lt lv ms mr my ne nl no pl pt ro ru si sk sl sq sr sv sw ta te th tr uk ur uz vi zh'.split(' ');
const languageNames = new Intl.DisplayNames(['zh-TW'], { type: 'language' });
export const languageOptions: SelectOption[] = languageCodes.map(code => ({ value: languageNames.of(code) || code, label: languageNames.of(code) || code })).sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'));
