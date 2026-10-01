import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentProfile, PersonalInfo, StudentClassification, ReligionProfiling, HealthMedicalProfiling } from '../../types';
import {
  User,
  Layers,
  Church,
  HeartPulse,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowRight,
  ArrowLeft,
  Info,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../common/Badge';

type Step = 'personal' | 'classifications' | 'religion' | 'health' | 'review';

export const StudentProfileForm: React.FC<{
  onSavedCallback?: () => void;
}> = ({ onSavedCallback }) => {
  const { currentStudentProfile, updateStudentProfile, submitProfileForReview } = useApp();

  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local form state cloned from context
  const [personal, setPersonal] = useState<PersonalInfo>(() => {
    return (
      currentStudentProfile?.personalInfo || {
        studentNumber: '',
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        dateOfBirth: '2004-01-01',
        gender: 'Male',
        civilStatus: 'Single',
        citizenship: 'Filipino',
        personalEmail: '',
        universityEmail: '',
        contactNumber: '',
        residentialAddress: '',
        permanentAddress: '',
        guardianName: '',
        guardianContact: '',
        guardianRelationship: '',
      }
    );
  });

  const [classifications, setClassifications] = useState<StudentClassification>(() => {
    return (
      currentStudentProfile?.classifications || {
        isIP: false,
        ipGroupName: '',
        isPWD: false,
        pwdType: 'Mobility Impairment',
        pwdDetails: '',
        requiresGroundFloor: false,
        isShifter: false,
        previousProgram: '',
        shifterReason: '',
        isTransferee: false,
        previousSchool: '',
        creditedUnits: 0,
        isWorkingStudent: false,
        workingHours: '',
      }
    );
  });

  const [religion, setReligion] = useState<ReligionProfiling>(() => {
    return (
      currentStudentProfile?.religionProfiling || {
        religion: 'Roman Catholic',
        hasSchedulingObservance: false,
        observanceDetails: '',
        restrictedDays: [],
        additionalNotes: '',
      }
    );
  });

  const [health, setHealth] = useState<HealthMedicalProfiling>(() => {
    return (
      currentStudentProfile?.healthMedicalProfiling || {
        bloodType: 'O+',
        hasMedicalCondition: false,
        allergies: '',
        chronicConditions: '',
        physicalMobilityAssistanceNeeded: false,
        mobilityDetails: '',
        emergencyContactName: '',
        emergencyContactRelationship: '',
        emergencyContactPhone: '',
        authorizedForFacultyEvaluation: true,
        medicalNotesForAdviser: '',
      }
    );
  });

  if (!currentStudentProfile) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500">No active student profile loaded.</p>
      </div>
    );
  }

  const stepsConfig: { id: Step; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'personal', label: '1. Personal Info', icon: <User className="w-4 h-4" />, desc: 'Identity & Contacts' },
    { id: 'classifications', label: '2. Classifications', icon: <Layers className="w-4 h-4" />, desc: 'IP, PWD, Shifter, Transferee' },
    { id: 'religion', label: '3. Religion & Schedule', icon: <Church className="w-4 h-4" />, desc: 'Sabbath / Observances' },
    { id: 'health', label: '4. Health & Medical', icon: <HeartPulse className="w-4 h-4" />, desc: 'Allergies & Faculty Authorization' },
    { id: 'review', label: '5. Review & Submit', icon: <CheckCircle2 className="w-4 h-4" />, desc: 'Verification' },
  ];

  const handleToggleRestrictedDay = (day: string) => {
    setReligion((prev) => {
      const current = prev.restrictedDays || [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return { ...prev, restrictedDays: updated };
    });
  };

  const handleSaveAndSubmit = (finalSubmit = false) => {
    if (!currentStudentProfile) return;

    updateStudentProfile(currentStudentProfile.studentNumber, {
      personalInfo: personal,
      classifications: classifications,
      religionProfiling: religion,
      healthMedicalProfiling: health,
    });

    if (finalSubmit) {
      submitProfileForReview(currentStudentProfile.studentNumber);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      if (onSavedCallback) onSavedCallback();
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Intent Explanation */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/60">
                Student Profile Management
              </span>
              <span className="text-xs text-slate-500 font-mono">
                #{currentStudentProfile.studentNumber}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">
              Comprehensive Student Profiling & Enrollment Form
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Please maintain accurate personal, classification, religious observance, and authorized health data to ensure optimal section placement and faculty academic evaluation.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleSaveAndSubmit(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>
            <button
              onClick={() => {
                setCurrentStep('review');
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              Review & Finalize
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Step Navigation Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-6 pt-6 border-t border-slate-100">
          {stepsConfig.map((s) => {
            const isActive = currentStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  isActive
                    ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-900'
                    : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`p-1.5 rounded-lg ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {s.icon}
                  </span>
                  <span className="text-xs font-bold truncate">{s.label}</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate pl-0.5">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Banner */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold">Student Profile Saved Successfully!</p>
            <p className="text-[11px] text-emerald-700">
              Your profile information and special profiling considerations have been updated for faculty evaluation.
            </p>
          </div>
        </div>
      )}

      {/* STEP 1: Personal & Demographic Info */}
      {currentStep === 'personal' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              Personal & Contact Information
            </h2>
            <p className="text-xs text-slate-500">
              Basic identification and verified university contact channels.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Student Number <span className="text-slate-400 font-normal">(System ID)</span>
              </label>
              <input
                type="text"
                value={personal.studentNumber}
                disabled
                className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={personal.firstName}
                onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
                placeholder="First name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Middle Name
              </label>
              <input
                type="text"
                value={personal.middleName || ''}
                onChange={(e) => setPersonal({ ...personal, middleName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
                placeholder="Middle name (optional)"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={personal.lastName}
                onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
                placeholder="Last name"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date of Birth <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={personal.dateOfBirth}
                onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={personal.gender}
                onChange={(e) =>
                  setPersonal({
                    ...personal,
                    gender: e.target.value as PersonalInfo['gender'],
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900 bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Civil Status
              </label>
              <select
                value={personal.civilStatus}
                onChange={(e) =>
                  setPersonal({
                    ...personal,
                    civilStatus: e.target.value as PersonalInfo['civilStatus'],
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900 bg-white"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Citizenship
              </label>
              <input
                type="text"
                value={personal.citizenship}
                onChange={(e) => setPersonal({ ...personal, citizenship: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Contact Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={personal.contactNumber}
                onChange={(e) => setPersonal({ ...personal, contactNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
                placeholder="+63 9XX XXX XXXX"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Personal Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={personal.personalEmail}
                onChange={(e) => setPersonal({ ...personal, personalEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
                placeholder="personal@gmail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                University Email Address
              </label>
              <input
                type="email"
                value={personal.universityEmail}
                onChange={(e) => setPersonal({ ...personal, universityEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Residential Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={personal.residentialAddress}
                onChange={(e) =>
                  setPersonal({ ...personal, residentialAddress: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
                placeholder="Street address, Barangay, City, Province"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Permanent Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={personal.permanentAddress}
                onChange={(e) =>
                  setPersonal({ ...personal, permanentAddress: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-900"
                placeholder="Permanent home address"
              />
            </div>
          </div>

          {/* Guardian Emergency Details */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Primary Parent / Legal Guardian Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Guardian Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={personal.guardianName}
                  onChange={(e) =>
                    setPersonal({ ...personal, guardianName: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                  placeholder="Parent / Guardian Name"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Relationship <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={personal.guardianRelationship}
                  onChange={(e) =>
                    setPersonal({ ...personal, guardianRelationship: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                  placeholder="Mother / Father / Guardian"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Guardian Contact Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={personal.guardianContact}
                  onChange={(e) =>
                    setPersonal({ ...personal, guardianContact: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setCurrentStep('classifications')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
            >
              Next: Classifications (IP, PWD, Shifter, Transferee)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Special Classifications */}
      {currentStep === 'classifications' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Special Student Classifications & Status
            </h2>
            <p className="text-xs text-slate-500">
              Indicate any applicable categories such as Indigenous Peoples (IP), Person with Disability (PWD), Academic Shifter, or Transferee for proper advisement accommodations.
            </p>
          </div>

          <div className="space-y-4">
            {/* Classification 1: Indigenous Peoples (IP) */}
            <div className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isIP"
                    checked={classifications.isIP}
                    onChange={(e) =>
                      setClassifications({ ...classifications, isIP: e.target.checked })
                    }
                    className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500"
                  />
                  <label htmlFor="isIP" className="cursor-pointer">
                    <span className="text-sm font-bold text-slate-900 block">
                      Member of Indigenous Peoples (IP) / Indigenous Cultural Community
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Recognized under National Commission on Indigenous Peoples (NCIP)
                    </span>
                  </label>
                </div>
                {classifications.isIP && (
                  <Badge variant="purple" size="sm">
                    IP Flagged
                  </Badge>
                )}
              </div>

              {classifications.isIP && (
                <div className="pl-7 pt-2 animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specific Ethnolinguistic Group / Tribe Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={classifications.ipGroupName || ''}
                    onChange={(e) =>
                      setClassifications({ ...classifications, ipGroupName: e.target.value })
                    }
                    className="w-full max-w-md px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    placeholder="e.g., Manobo, Tagbanwa, Igorot, Blaan, Badjao, Mangyan"
                  />
                </div>
              )}
            </div>

            {/* Classification 2: Person with Disability (PWD) */}
            <div className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPWD"
                    checked={classifications.isPWD}
                    onChange={(e) =>
                      setClassifications({ ...classifications, isPWD: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500"
                  />
                  <label htmlFor="isPWD" className="cursor-pointer">
                    <span className="text-sm font-bold text-slate-900 block">
                      Person with Disability (PWD) / Special Physical Accessibility Needs
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Used for room placement, ground-floor classroom requests, and faculty assistance
                    </span>
                  </label>
                </div>
                {classifications.isPWD && (
                  <Badge variant="info" size="sm">
                    PWD Accommodation
                  </Badge>
                )}
              </div>

              {classifications.isPWD && (
                <div className="pl-7 pt-2 space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Disability Classification <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={classifications.pwdType}
                        onChange={(e) =>
                          setClassifications({
                            ...classifications,
                            pwdType: e.target.value as StudentClassification['pwdType'],
                          })
                        }
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                      >
                        <option value="Mobility Impairment">Mobility Impairment (Wheelchair/Crutches)</option>
                        <option value="Visual Impairment">Visual Impairment / Low Vision</option>
                        <option value="Hearing Impairment">Hearing Impairment / Deaf</option>
                        <option value="Neurodivergent / Learning Disability">Neurodivergent / Learning Disability</option>
                        <option value="Chronic Health">Chronic Health Disability</option>
                        <option value="Other">Other Category</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={classifications.requiresGroundFloor}
                          onChange={(e) =>
                            setClassifications({
                              ...classifications,
                              requiresGroundFloor: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span>Requires Ground Floor / Elevator Accessible Lecture Rooms</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Details / Specific Support Accommodations Needed
                    </label>
                    <textarea
                      rows={2}
                      value={classifications.pwdDetails || ''}
                      onChange={(e) =>
                        setClassifications({ ...classifications, pwdDetails: e.target.value })
                      }
                      className="w-full max-w-2xl px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                      placeholder="e.g., Uses orthopedic wheelchair, requires front-row seating, assistive screen-reader compatibility"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Classification 3: Shifter Status */}
            <div className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isShifter"
                    checked={classifications.isShifter}
                    onChange={(e) =>
                      setClassifications({ ...classifications, isShifter: e.target.checked })
                    }
                    className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
                  />
                  <label htmlFor="isShifter" className="cursor-pointer">
                    <span className="text-sm font-bold text-slate-900 block">
                      Academic Shifter Status
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Student has changed from another degree program within the university
                    </span>
                  </label>
                </div>
                {classifications.isShifter && (
                  <Badge variant="amber" size="sm">
                    Shifter
                  </Badge>
                )}
              </div>

              {classifications.isShifter && (
                <div className="pl-7 pt-2 space-y-3 max-w-2xl animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Previous Degree Program / College <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={classifications.previousProgram || ''}
                      onChange={(e) =>
                        setClassifications({ ...classifications, previousProgram: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                      placeholder="e.g., BS Civil Engineering (1st - 2nd Year)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reason for Shifting / Program Alignment
                    </label>
                    <input
                      type="text"
                      value={classifications.shifterReason || ''}
                      onChange={(e) =>
                        setClassifications({ ...classifications, shifterReason: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                      placeholder="e.g., Career alignment with software development and analytics"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Classification 4: Transferee Status */}
            <div className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isTransferee"
                    checked={classifications.isTransferee}
                    onChange={(e) =>
                      setClassifications({ ...classifications, isTransferee: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                  />
                  <label htmlFor="isTransferee" className="cursor-pointer">
                    <span className="text-sm font-bold text-slate-900 block">
                      Transferee Student Status
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Transferred from another accredited college or university
                    </span>
                  </label>
                </div>
                {classifications.isTransferee && (
                  <Badge variant="success" size="sm">
                    Transferee
                  </Badge>
                )}
              </div>

              {classifications.isTransferee && (
                <div className="pl-7 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Originating Institution / University <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={classifications.previousSchool || ''}
                      onChange={(e) =>
                        setClassifications({ ...classifications, previousSchool: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                      placeholder="Previous College / University Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Total Credited Units Approved
                    </label>
                    <input
                      type="number"
                      value={classifications.creditedUnits || 0}
                      onChange={(e) =>
                        setClassifications({
                          ...classifications,
                          creditedUnits: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Classification 5: Working Student */}
            <div className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isWorking"
                    checked={classifications.isWorkingStudent}
                    onChange={(e) =>
                      setClassifications({
                        ...classifications,
                        isWorkingStudent: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500"
                  />
                  <label htmlFor="isWorking" className="cursor-pointer">
                    <span className="text-sm font-bold text-slate-900 block">
                      Employed / Working Student Status
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Enables faculty advisers to consider employment shift conflicts during sectioning
                    </span>
                  </label>
                </div>
                {classifications.isWorkingStudent && (
                  <Badge variant="purple" size="sm">
                    Working Student
                  </Badge>
                )}
              </div>

              {classifications.isWorkingStudent && (
                <div className="pl-7 pt-2 animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Work Shift Schedule & Organization Details
                  </label>
                  <input
                    type="text"
                    value={classifications.workingHours || ''}
                    onChange={(e) =>
                      setClassifications({ ...classifications, workingHours: e.target.value })
                    }
                    className="w-full max-w-2xl px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white outline-none"
                    placeholder="e.g., Evening shifts 6:00 PM - 10:00 PM (Part-time Software QA)"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep('personal')}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setCurrentStep('religion')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
            >
              Next: Religion & Scheduling Observances
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Religion & Scheduling Observance */}
      {currentStep === 'religion' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Church className="w-5 h-5 text-amber-600" />
              Religious Affiliation & Scheduling Observance
            </h2>
            <p className="text-xs text-slate-500">
              Provide religious details when relevant to class schedule placement (e.g., Saturday Sabbath, Friday evening prayers, Sunday worship).
            </p>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Religious Affiliation / Denomination <span className="text-rose-500">*</span>
              </label>
              <select
                value={religion.religion}
                onChange={(e) => setReligion({ ...religion, religion: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
              >
                <option value="Roman Catholic">Roman Catholic</option>
                <option value="Seventh-day Adventist">Seventh-day Adventist (Sabbath Observer)</option>
                <option value="Islam / Muslim">Islam / Muslim (Jumu'ah Observance)</option>
                <option value="Iglesia ni Cristo">Iglesia ni Cristo</option>
                <option value="Christian (Evangelical / Protestant)">Christian (Evangelical / Protestant)</option>
                <option value="Jehovah's Witnesses">Jehovah's Witnesses</option>
                <option value="Buddhism">Buddhism</option>
                <option value="Other / Non-affiliated">Other / Non-affiliated</option>
              </select>
            </div>

            {/* Observance Toggle */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={religion.hasSchedulingObservance}
                  onChange={(e) =>
                    setReligion({ ...religion, hasSchedulingObservance: e.target.checked })
                  }
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-amber-950 block">
                    My religion has sacred observances requiring specific scheduling considerations
                  </span>
                  <span className="text-[11px] text-amber-800">
                    Enables the faculty and registrar to assign sections without conflicting class or exam hours.
                  </span>
                </div>
              </label>

              {religion.hasSchedulingObservance && (
                <div className="pt-2 space-y-3 border-t border-amber-200/60">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1.5">
                      Check Restricted Schedule Periods:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Friday Sunset / Evening',
                        'Saturday (Full Day)',
                        'Saturday Morning',
                        'Saturday Afternoon',
                        'Sunday Morning',
                        'Sunday Afternoon',
                      ].map((day) => {
                        const isChecked = religion.restrictedDays?.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => handleToggleRestrictedDay(day)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              isChecked
                                ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                                : 'bg-white text-slate-700 border-amber-300 hover:bg-amber-100/50'
                            }`}
                          >
                            {isChecked ? '✓ ' : '+ '}
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Observance Details & Scheduling Justification
                    </label>
                    <textarea
                      rows={2}
                      value={religion.observanceDetails || ''}
                      onChange={(e) =>
                        setReligion({ ...religion, observanceDetails: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-amber-300 rounded-xl bg-white outline-none"
                      placeholder="e.g., Strict Sabbath observance from Friday 6:00 PM to Saturday 6:00 PM. Kindly assign weekday block section only."
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Notes for Section Placement Committee
              </label>
              <input
                type="text"
                value={religion.additionalNotes || ''}
                onChange={(e) => setReligion({ ...religion, additionalNotes: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none"
                placeholder="Optional notes regarding schedule or religious holidays"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep('classifications')}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setCurrentStep('health')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
            >
              Next: Authorized Health & Medical Info
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Authorized Health & Medical Information */}
      {currentStep === 'health' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-rose-600" />
              Authorized Health & Medical Information
            </h2>
            <p className="text-xs text-slate-500">
              Provide medical or physical information relevant for faculty advisers, lab safety, and campus health assistance.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Blood Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={health.bloodType}
                  onChange={(e) =>
                    setHealth({
                      ...health,
                      bloodType: e.target.value as HealthMedicalProfiling['bloodType'],
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none font-mono"
                >
                  <option value="O+">O Positive (O+)</option>
                  <option value="O-">O Negative (O-)</option>
                  <option value="A+">A Positive (A+)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                  <option value="Unknown">Unknown / Pending Lab Result</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Allergies (Medicinal or Environmental)
                </label>
                <input
                  type="text"
                  value={health.allergies || ''}
                  onChange={(e) => setHealth({ ...health, allergies: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none"
                  placeholder="e.g., Penicillin, Peanuts, Pollen, Severe Dust"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chronic Illnesses / Ongoing Health Conditions
                </label>
                <input
                  type="text"
                  value={health.chronicConditions || ''}
                  onChange={(e) => setHealth({ ...health, chronicConditions: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none"
                  placeholder="e.g., Asthma, Epilepsy, Type 1 Diabetes, Hypertension"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Physical Mobility & Classroom Needs
                </label>
                <input
                  type="text"
                  value={health.mobilityDetails || ''}
                  onChange={(e) => setHealth({ ...health, mobilityDetails: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none"
                  placeholder="e.g., Requires ground floor labs, elevator access"
                />
              </div>
            </div>

            {/* Emergency Medical Contact */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 max-w-2xl">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                Emergency Medical Contact Person
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={health.emergencyContactName}
                    onChange={(e) =>
                      setHealth({ ...health, emergencyContactName: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Relationship <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={health.emergencyContactRelationship}
                    onChange={(e) =>
                      setHealth({
                        ...health,
                        emergencyContactRelationship: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    placeholder="e.g. Mother / Father"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Emergency Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={health.emergencyContactPhone}
                    onChange={(e) =>
                      setHealth({ ...health, emergencyContactPhone: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
              </div>
            </div>

            {/* Explicit Authorization & Data Privacy Consent Banner (Required by Functional Requirements) */}
            <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 max-w-2xl space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={health.authorizedForFacultyEvaluation}
                  onChange={(e) =>
                    setHealth({
                      ...health,
                      authorizedForFacultyEvaluation: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-indigo-600 rounded mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-indigo-950 block">
                    Authorization for Faculty & Department Evaluation Access
                  </span>
                  <span className="text-[11px] text-indigo-800 leading-relaxed block mt-0.5">
                    I hereby authorize the College Academic Advisers, Department Evaluation Committee, and Registrar to access my relevant medical and classification profile strictly for sectioning, academic accommodations, and campus safety.
                  </span>
                </div>
              </label>
            </div>

            <div className="max-w-2xl">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confidential Notes for Assigned Faculty Adviser
              </label>
              <textarea
                rows={2}
                value={health.medicalNotesForAdviser || ''}
                onChange={(e) =>
                  setHealth({ ...health, medicalNotesForAdviser: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white outline-none"
                placeholder="Any special medical considerations you want your assigned faculty evaluator to know..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep('religion')}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setCurrentStep('review')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
            >
              Proceed to Review & Verification
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Comprehensive Review & Verification before Submitting */}
      {currentStep === 'review' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Review & Confirm Profile Submission
              </h2>
              <p className="text-xs text-slate-500">
                Please carefully verify all details below before finalizing your student profiling information.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Ready for Submission
            </span>
          </div>

          {/* Dossier Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Review Block 1: Personal Info */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  Personal Information
                </span>
                <button
                  onClick={() => setCurrentStep('personal')}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs space-y-1 text-slate-700">
                <p>
                  <strong className="text-slate-900">Name:</strong> {personal.firstName}{' '}
                  {personal.middleName} {personal.lastName}
                </p>
                <p>
                  <strong className="text-slate-900">DOB / Gender:</strong> {personal.dateOfBirth} ({personal.gender})
                </p>
                <p>
                  <strong className="text-slate-900">Contact:</strong> {personal.contactNumber} • {personal.personalEmail}
                </p>
                <p>
                  <strong className="text-slate-900">Guardian:</strong> {personal.guardianName} ({personal.guardianRelationship}) - {personal.guardianContact}
                </p>
              </div>
            </div>

            {/* Review Block 2: Special Classifications */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  Special Classifications
                </span>
                <button
                  onClick={() => setCurrentStep('classifications')}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs space-y-1.5 text-slate-700">
                <div className="flex flex-wrap gap-1.5">
                  {classifications.isIP ? (
                    <Badge variant="purple" size="sm">
                      IP: {classifications.ipGroupName}
                    </Badge>
                  ) : (
                    <span className="text-slate-400">No IP status •</span>
                  )}
                  {classifications.isPWD ? (
                    <Badge variant="info" size="sm">
                      PWD: {classifications.pwdType}
                    </Badge>
                  ) : (
                    <span className="text-slate-400">No PWD status •</span>
                  )}
                  {classifications.isShifter && (
                    <Badge variant="amber" size="sm">
                      Shifter
                    </Badge>
                  )}
                  {classifications.isTransferee && (
                    <Badge variant="success" size="sm">
                      Transferee
                    </Badge>
                  )}
                  {classifications.isWorkingStudent && (
                    <Badge variant="default" size="sm">
                      Working Student
                    </Badge>
                  )}
                </div>
                {classifications.requiresGroundFloor && (
                  <p className="text-indigo-700 font-semibold text-[11px]">
                    ✓ Requires Ground Floor / Elevator Accessible Classrooms
                  </p>
                )}
                {classifications.isShifter && (
                  <p className="text-[11px] text-slate-600">
                    Previous Program: {classifications.previousProgram}
                  </p>
                )}
              </div>
            </div>

            {/* Review Block 3: Religion & Scheduling */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Church className="w-3.5 h-3.5 text-amber-600" />
                  Religion & Scheduling
                </span>
                <button
                  onClick={() => setCurrentStep('religion')}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs space-y-1 text-slate-700">
                <p>
                  <strong className="text-slate-900">Declared Religion:</strong>{' '}
                  {religion.religion}
                </p>
                <p>
                  <strong className="text-slate-900">Restricted Days:</strong>{' '}
                  {religion.restrictedDays?.length
                    ? religion.restrictedDays.join(', ')
                    : 'None reported'}
                </p>
                {religion.observanceDetails && (
                  <p className="text-[11px] italic text-slate-600">
                    "{religion.observanceDetails}"
                  </p>
                )}
              </div>
            </div>

            {/* Review Block 4: Health & Authorization */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                  Health & Medical Authorization
                </span>
                <button
                  onClick={() => setCurrentStep('health')}
                  className="text-[11px] text-indigo-600 hover:underline font-semibold"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs space-y-1 text-slate-700">
                <p>
                  <strong className="text-slate-900">Blood Type:</strong>{' '}
                  <span className="font-mono font-bold text-rose-700">
                    {health.bloodType}
                  </span>
                </p>
                <p>
                  <strong className="text-slate-900">Allergies / Conditions:</strong>{' '}
                  {health.allergies || health.chronicConditions || 'None reported'}
                </p>
                <p>
                  <strong className="text-slate-900">Faculty Evaluation Consent:</strong>{' '}
                  <span
                    className={
                      health.authorizedForFacultyEvaluation
                        ? 'text-emerald-700 font-bold'
                        : 'text-rose-700 font-bold'
                    }
                  >
                    {health.authorizedForFacultyEvaluation ? 'Authorized ✓' : 'Withheld ✗'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation & Final Submit Banner */}
          <div className="p-5 rounded-2xl bg-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-extrabold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Ready to Submit Student Profile?
              </h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                Submitting updates the university database and notifies your assigned faculty evaluator for sectioning.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleSaveAndSubmit(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSaveAndSubmit(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-extrabold transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Profile for Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
