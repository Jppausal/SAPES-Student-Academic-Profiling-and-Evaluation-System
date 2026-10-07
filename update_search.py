import re

def main():
    with open('client/src/components/admin/BackendAcademicRecordManager.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Normalize line endings for regex matching
    content = content.replace('\r\n', '\n')

    # 1. Add fetchStudentSuggestions and StudentSuggestion to imports
    if 'fetchStudentSuggestions' not in content:
        content = content.replace(
            'fetchStudentReport,',
            'fetchStudentReport,\n  fetchStudentSuggestions,\n  StudentSuggestion,'
        )
    
    # 2. Add React useEffect import if missing
    if 'useEffect' not in content:
        content = content.replace(
            "import React, { useState } from 'react';",
            "import React, { useEffect, useState } from 'react';"
        )

    # 3. Add the states
    states_str = """  const [activeTab, setActiveTab] = useState<'academic' | 'profile'>('academic');
  const [institutionId, setInstitutionId] = useState('');
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);"""
    
    if 'suggestionsLoading' not in content:
        content = content.replace(
            "  const [activeTab, setActiveTab] = useState<'academic' | 'profile'>('academic');\n  const [institutionId, setInstitutionId] = useState('');",
            states_str
        )

    # 4. Add the useEffect
    use_effect_str = """
  useEffect(() => {
    const query = institutionId.trim();
    if (!query || report) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionsLoading(false);
      setSuggestionsError('');
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      setSuggestionsError('');
      try {
        const matches = await fetchStudentSuggestions(query);
        if (!active) return;
        setSuggestions(matches);
        setSuggestionsOpen(true);
        setActiveSuggestionIndex(-1);
      } catch (requestError) {
        if (!active) return;
        setSuggestions([]);
        setSuggestionsError(requestError instanceof Error ? requestError.message : 'Unable to load suggestions.');
      } finally {
        if (active) setSuggestionsLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [institutionId, report]);

  const loadReport = async (studentId = institutionId.trim(), selectedSuggestion?: StudentSuggestion) => {
    if (!studentId) return;
    setLoading(true); setError(''); setMessage('');
    try {
      let match = selectedSuggestion;
      if (!match) {
        const matches = await fetchStudentSuggestions(studentId);
        const normalizedQuery = studentId.toLowerCase();
        const idMatch = matches.find((student) => student.institutionId.toLowerCase() === normalizedQuery);
        const usernameMatch = matches.find((student) => student.username.toLowerCase() === normalizedQuery);
        const fullNameMatches = matches.filter((student) => `${student.firstName} ${student.lastName}`.trim().toLowerCase() === normalizedQuery);
        match = idMatch || usernameMatch || (fullNameMatches.length === 1 ? fullNameMatches[0] : undefined);
        if (!match && matches.length === 1) match = matches[0];
        if (!match && matches.length) {
          throw new Error('Choose a student from the suggestions.');
        }
      }
      
      const targetId = match ? match.institutionId : studentId;
      const nextReport = await fetchStudentReport(targetId);
      setReport(nextReport);
      setInstitutionId(nextReport.student.institutionId);
      setSuggestions([]);
      setSuggestionsOpen(false);
      setRecord(nextReport.academicRecords[0]
        ? { ...nextReport.academicRecords[0], subjects: nextReport.academicRecords[0].subjects.map((subject) => ({ ...subject })) }
        : emptyRecord());
      setStatus(nextReport.student.academicStatus?.currentStatus || 'regular');
    } catch (requestError) {
      setReport(null); setRecord(emptyRecord());
      setError(requestError instanceof Error ? requestError.message : 'Unable to load student record.');
    } finally { setLoading(false); }
  };
"""
    
    # replace the loadReport block
    if 'setSuggestionsOpen(false);' not in content:
        load_report_regex = re.compile(r'  const loadReport = async.*?finally \{ setLoading\(false\); \}\n  };', re.DOTALL)
        content = load_report_regex.sub(use_effect_str.strip(), content)

    # 5. replace the input with the combobox
    form_str = """        <form onSubmit={async (event) => { event.preventDefault(); await loadReport(); }} className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <input
              value={institutionId}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen}
              aria-controls="admin-student-search-suggestions"
              aria-activedescendant={activeSuggestionIndex >= 0 ? `admin-student-suggestion-${activeSuggestionIndex}` : undefined}
              onChange={(event) => {
                setInstitutionId(event.target.value);
                setReport(null);
                setError('');
                setSuggestionsOpen(Boolean(event.target.value.trim()));
              }}
              onFocus={() => { if (institutionId.trim()) setSuggestionsOpen(true); }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setSuggestionsOpen(false);
                if (event.key === 'ArrowDown' && suggestions.length) {
                  event.preventDefault();
                  setSuggestionsOpen(true);
                  setActiveSuggestionIndex((index) => Math.min(index + 1, suggestions.length - 1));
                }
                if (event.key === 'ArrowUp' && suggestions.length) {
                  event.preventDefault();
                  setActiveSuggestionIndex((index) => Math.max(index - 1, 0));
                }
                if (event.key === 'Enter' && suggestionsOpen && activeSuggestionIndex >= 0) {
                  event.preventDefault();
                  void loadReport(institutionId, suggestions[activeSuggestionIndex]);
                }
              }}
              placeholder="Enter a 10-digit student ID number or student's name"
              className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              required
            />
            {suggestionsOpen && (
              <ul id="admin-student-search-suggestions" role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {suggestionsLoading && <li className="px-3 py-2 text-xs text-slate-500">Searching students...</li>}
                {!suggestionsLoading && suggestionsError && <li role="alert" className="px-3 py-2 text-xs text-rose-600">{suggestionsError}</li>}
                {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">No matching students.</li>}
                {suggestions.map((student, index) => (
                  <li
                    key={student.institutionId}
                    id={`admin-student-suggestion-${index}`}
                    role="option"
                    aria-selected={index === activeSuggestionIndex}
                    onClick={() => void loadReport(institutionId, student)}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    className={`cursor-pointer px-3 py-2 transition-colors ${index === activeSuggestionIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{student.firstName} {student.lastName}</span>
                      <span className="text-xs text-slate-500">({student.institutionId})</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button disabled={loading} className="admin-primary-button whitespace-nowrap"><Search className="h-4 w-4 shrink-0" /> {loading ? 'Loading...' : 'Load Student'}</button>
        </form>"""

    # find form to replace
    if 'id="admin-student-search-suggestions"' not in content:
        form_regex = re.compile(r'<form onSubmit=\{async \(event\) => \{ event.preventDefault\(\); await loadReport\(\); \}\} className="mt-4 flex flex-col gap-2 sm:flex-row">.*?</form>', re.DOTALL)
        content = form_regex.sub(form_str, content)
    
    # write back, preserving CRLF if it was Windows
    content = content.replace('\n', '\r\n')
    with open('client/src/components/admin/BackendAcademicRecordManager.tsx', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    main()
