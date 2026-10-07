import sys

with open('src/components/admin/BackendAcademicRecordManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.rfind('</section>')
if idx == -1:
    print('Not found')
    sys.exit(1)

# Find the specific </section> that we want to replace after
idx = content.rfind('</section>\n        </>\n      )}\n    </div>\n  );\n};')

if idx == -1:
    idx = content.rfind('</section>\r\n        </>\r\n      )}\r\n    </div>\r\n  );\r\n};')

if idx != -1:
    new_content = content[:idx] + '''</section>
            </>
          )}

          {activeTab === 'profile' && (
            <div className="mt-6">
              <AdminStudentProfileSetup identity={report.student} onSaved={async () => { await loadReport(); }} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
'''
    with open('src/components/admin/BackendAcademicRecordManager.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Success')
else:
    print('Still not found')
