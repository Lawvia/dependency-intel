import { useState } from 'react';

export default function SearchBar({ onSearch, loading }) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [ecosystem, setEcosystem] = useState('npm');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSearch(name.trim(), version.trim(), ecosystem);
  };

  return (
    <form className="search-section" onSubmit={handleSubmit}>
      <div className="search-row">
        <select
          className="input select"
          value={ecosystem}
          onChange={(e) => setEcosystem(e.target.value)}
          style={{ maxWidth: '140px' }}
          id="search-ecosystem"
        >
          <option value="npm">npm</option>
          <option value="PyPI">PyPI</option>
          <option value="Go">Go</option>
          <option value="crates.io">Cargo</option>
        </select>
        <div className="search-input-wrapper" style={{ flex: 2 }}>
          <span className="search-icon">🔍</span>
          <input
            className="input search-input"
            type="text"
            placeholder="Package name (e.g., lodash)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            id="search-name"
          />
        </div>
        <input
          className="input"
          type="text"
          placeholder="Version (optional)"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          style={{ maxWidth: '140px' }}
          id="search-version"
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !name.trim()} id="search-submit">
          {loading ? <span className="spinner" /> : 'Scan'}
        </button>
      </div>
    </form>
  );
}
