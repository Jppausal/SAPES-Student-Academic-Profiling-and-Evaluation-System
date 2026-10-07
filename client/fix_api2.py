import sys, re

with open('src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\r\n', '\n')

content = content.replace('  enrollmentInformation?: Record<string, string>;\n', '')
content = content.replace('  classification?: {\n    program?: string;\n    studentType?: string;\n    isIP?: boolean;\n    isPWD?: boolean;\n    isShifter?: boolean;\n    isTransferee?: boolean;\n    indigenousGroup?: string;\n  };\n', '')

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

with open('src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
