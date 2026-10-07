import sys

with open('src/components/admin/BackendAcademicRecordManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.rfind('</section>')
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
    print('Success!')
else:
    print('Not found!')
