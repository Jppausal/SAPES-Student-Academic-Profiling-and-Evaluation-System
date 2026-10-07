import sys, re

with open('src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add to StudentProfileUpdate
content = content.replace(
    '  religiousInformation?: { religion?: string; shareSpiritualSchedule?: boolean; spiritualActivities?: Array<{ dayOfWeek: string; startTime: string; endTime: string }> };\n}',
    '''  religiousInformation?: { religion?: string; shareSpiritualSchedule?: boolean; spiritualActivities?: Array<{ dayOfWeek: string; startTime: string; endTime: string }> };
  classification?: { program?: string; studentType?: string; indigenousGroup?: string; isIP?: boolean; isPWD?: boolean; isShifter?: boolean; isTransferee?: boolean };
  enrollmentInformation?: { course?: string; level?: string; department?: string; curriculum?: string; yearLevel?: string; entryPeriod?: string; studentType?: string; preferredModality?: string; campus?: string; learnerReferenceNo?: string; nstpNumber?: string; entryDate?: string };
}'''
)

# Replace updateStudentProfile if it exists, or append it
if 'export async function updateStudentProfile' in content:
    content = re.sub(
        r'export async function updateStudentProfile.*?return response\.data;\n\}',
        '''export async function updateStudentProfile(institutionId: string, updates: StudentProfileUpdate) {
  const response = await request<{ success: boolean; data: StudentIdentity }>(/api/students/, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return response.data;
}''',
        content,
        flags=re.DOTALL
    )
else:
    content += '''

export async function updateStudentProfile(institutionId: string, updates: StudentProfileUpdate) {
  const response = await request<{ success: boolean; data: StudentIdentity }>(/api/students/, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return response.data;
}
'''

with open('src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
