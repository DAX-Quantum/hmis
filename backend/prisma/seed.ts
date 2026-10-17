import { PrismaClient, UserRole, Gender, BloodGroup, AppointmentType, AppointmentStatus, ConsultationStatus, PrescriptionStatus, MedicineForm, LabPriority, LabOrderStatus, ResultFlag, InvoiceStatus, InvoiceItemType, PaymentMethod, PaymentStatus, WardType, RoomType, BedStatus, AdmissionStatus, AdmissionType, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting HMIS database seeding...');

  // Clean existing data in reverse relation order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.vital.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.department.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing records.');

  const defaultPassword = await bcrypt.hash('Password@123', 10);
  const adminPassword = await bcrypt.hash('Admin@123456', 10);

  // --------------------------------------------------------------------------
  // 1. PERMISSIONS
  // --------------------------------------------------------------------------
  const permissionsList = [
    { name: 'PATIENT_READ', category: 'Patient', description: 'View patient records' },
    { name: 'PATIENT_CREATE', category: 'Patient', description: 'Register new patient' },
    { name: 'PATIENT_UPDATE', category: 'Patient', description: 'Update patient information' },
    { name: 'PATIENT_DELETE', category: 'Patient', description: 'Remove patient records' },
    { name: 'APPOINTMENT_READ', category: 'Appointment', description: 'View appointment schedule' },
    { name: 'APPOINTMENT_CREATE', category: 'Appointment', description: 'Book appointments' },
    { name: 'APPOINTMENT_UPDATE', category: 'Appointment', description: 'Modify or reschedule appointments' },
    { name: 'APPOINTMENT_CANCEL', category: 'Appointment', description: 'Cancel appointments' },
    { name: 'MEDICAL_RECORD_READ', category: 'EMR', description: 'View medical records and history' },
    { name: 'MEDICAL_RECORD_CREATE', category: 'EMR', description: 'Add notes and medical records' },
    { name: 'MEDICAL_RECORD_UPDATE', category: 'EMR', description: 'Edit existing medical records' },
    { name: 'CONSULTATION_MANAGE', category: 'Consultation', description: 'Conduct consultations and diagnoses' },
    { name: 'PRESCRIPTION_CREATE', category: 'Prescription', description: 'Issue prescriptions' },
    { name: 'PRESCRIPTION_READ', category: 'Prescription', description: 'Read prescriptions' },
    { name: 'LAB_ORDER_CREATE', category: 'Laboratory', description: 'Order diagnostic tests' },
    { name: 'LAB_RESULT_CREATE', category: 'Laboratory', description: 'Enter test results' },
    { name: 'LAB_RESULT_VERIFY', category: 'Laboratory', description: 'Verify test results' },
    { name: 'PHARMACY_MANAGE', category: 'Pharmacy', description: 'Manage inventory and dispense' },
    { name: 'BILLING_MANAGE', category: 'Billing', description: 'Create invoices and collect payments' },
    { name: 'ADMISSION_MANAGE', category: 'Inpatient', description: 'Admit and discharge patients' },
    { name: 'USER_MANAGE', category: 'Administration', description: 'Manage users and roles' },
    { name: 'AUDIT_LOG_READ', category: 'Administration', description: 'Review system audit logs' },
    { name: 'REPORTS_READ', category: 'Analytics', description: 'View operational reports' },
  ];

  const permissions: Record<string, any> = {};
  for (const perm of permissionsList) {
    permissions[perm.name] = await prisma.permission.create({ data: perm });
  }

  // Assign default permissions to roles
  const rolePermissionsMap: Record<UserRole, string[]> = {
    SUPER_ADMIN: permissionsList.map(p => p.name),
    ADMIN: permissionsList.map(p => p.name),
    DOCTOR: [
      'PATIENT_READ', 'PATIENT_CREATE', 'PATIENT_UPDATE',
      'APPOINTMENT_READ', 'APPOINTMENT_UPDATE',
      'MEDICAL_RECORD_READ', 'MEDICAL_RECORD_CREATE', 'MEDICAL_RECORD_UPDATE',
      'CONSULTATION_MANAGE', 'PRESCRIPTION_CREATE', 'PRESCRIPTION_READ',
      'LAB_ORDER_CREATE', 'LAB_RESULT_CREATE',
      'ADMISSION_MANAGE', 'REPORTS_READ'
    ],
    NURSE: [
      'PATIENT_READ', 'APPOINTMENT_READ', 'APPOINTMENT_UPDATE',
      'MEDICAL_RECORD_READ', 'MEDICAL_RECORD_CREATE',
      'ADMISSION_MANAGE'
    ],
    RECEPTIONIST: [
      'PATIENT_READ', 'PATIENT_CREATE', 'PATIENT_UPDATE',
      'APPOINTMENT_READ', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE', 'APPOINTMENT_CANCEL',
      'BILLING_MANAGE'
    ],
    PHARMACIST: [
      'PATIENT_READ', 'PRESCRIPTION_READ', 'PHARMACY_MANAGE', 'BILLING_MANAGE'
    ],
    LAB_TECHNICIAN: [
      'PATIENT_READ', 'LAB_ORDER_CREATE', 'LAB_RESULT_CREATE', 'LAB_RESULT_VERIFY'
    ],
    ACCOUNTANT: [
      'PATIENT_READ', 'BILLING_MANAGE', 'REPORTS_READ'
    ],
    PATIENT: [
      'APPOINTMENT_READ', 'APPOINTMENT_CREATE', 'APPOINTMENT_CANCEL',
      'MEDICAL_RECORD_READ', 'PRESCRIPTION_READ'
    ],
  };

  for (const [role, perms] of Object.entries(rolePermissionsMap)) {
    for (const permName of perms) {
      if (permissions[permName]) {
        await prisma.rolePermission.create({
          data: {
            role: role as UserRole,
            permissionId: permissions[permName].id,
          },
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. CORE USERS
  // --------------------------------------------------------------------------
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@hmis.local',
      passwordHash: adminPassword,
      firstName: 'Alexander',
      lastName: 'Vance',
      role: UserRole.SUPER_ADMIN,
      phone: '+1 (555) 019-2831',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const staffNurse = await prisma.user.create({
    data: {
      email: 'nurse.sarah@hmis.local',
      passwordHash: defaultPassword,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      role: UserRole.NURSE,
      phone: '+1 (555) 019-4422',
      avatar: 'https://images.unsplash.com/photo-1594824813576-905f884260f9?w=150',
    },
  });

  const staffReceptionist = await prisma.user.create({
    data: {
      email: 'receptionist@hmis.local',
      passwordHash: defaultPassword,
      firstName: 'Emily',
      lastName: 'Davis',
      role: UserRole.RECEPTIONIST,
      phone: '+1 (555) 019-3388',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    },
  });

  const staffPharmacist = await prisma.user.create({
    data: {
      email: 'pharmacist@hmis.local',
      passwordHash: defaultPassword,
      firstName: 'Marcus',
      lastName: 'Brody',
      role: UserRole.PHARMACIST,
      phone: '+1 (555) 019-7711',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const staffLabTech = await prisma.user.create({
    data: {
      email: 'labtech@hmis.local',
      passwordHash: defaultPassword,
      firstName: 'Elena',
      lastName: 'Rostova',
      role: UserRole.LAB_TECHNICIAN,
      phone: '+1 (555) 019-9944',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
  });

  const staffAccountant = await prisma.user.create({
    data: {
      email: 'accountant@hmis.local',
      passwordHash: defaultPassword,
      firstName: 'Julian',
      lastName: 'Mercer',
      role: UserRole.ACCOUNTANT,
      phone: '+1 (555) 019-6633',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  // --------------------------------------------------------------------------
  // 3. DEPARTMENTS
  // --------------------------------------------------------------------------
  const deptData = [
    { name: 'Cardiology', code: 'CARD', description: 'Advanced cardiovascular care and diagnostics', icon: 'HeartPulse' },
    { name: 'Neurology', code: 'NEUR', description: 'Disorders of the brain, spine, and nerves', icon: 'Brain' },
    { name: 'Pediatrics', code: 'PED', description: 'Comprehensive medical care for infants, children, and adolescents', icon: 'Baby' },
    { name: 'Orthopedics', code: 'ORTH', description: 'Musculoskeletal system, bone fractures, and joint replacements', icon: 'Bone' },
    { name: 'General Medicine', code: 'GEN', description: 'Primary care, internal medicine, and preventative health', icon: 'Stethoscope' },
    { name: 'Oncology', code: 'ONC', description: 'Cancer diagnosis, targeted therapy, and patient care', icon: 'Activity' },
    { name: 'Emergency Medicine', code: 'EMERG', description: '24/7 acute trauma and critical care stabilization', icon: 'Flame' },
  ];

  const departments: Record<string, any> = {};
  for (const d of deptData) {
    departments[d.code] = await prisma.department.create({ data: d });
  }

  // --------------------------------------------------------------------------
  // 4. DOCTORS & SCHEDULES
  // --------------------------------------------------------------------------
  const doctorsList = [
    {
      email: 'doctor.carter@hmis.local',
      firstName: 'Dr. Gregory',
      lastName: 'Carter',
      deptCode: 'CARD',
      specialization: 'Interventional Cardiology',
      licenseNumber: 'MD-CARD-89211',
      qualification: 'MD, FACC, Harvard Medical School',
      experienceYears: 16,
      consultationFee: 150.00,
      roomNumber: 'Room 302',
      bio: 'Leading specialist in cardiac catheterization, arrhythmia management, and preventive cardiology.',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150',
    },
    {
      email: 'doctor.patel@hmis.local',
      firstName: 'Dr. Priya',
      lastName: 'Patel',
      deptCode: 'NEUR',
      specialization: 'Clinical Neurophysiology',
      licenseNumber: 'MD-NEUR-77341',
      qualification: 'MD, PhD, Johns Hopkins Medicine',
      experienceYears: 12,
      consultationFee: 180.00,
      roomNumber: 'Room 410',
      bio: 'Specialist in migraine management, neuromuscular disorders, and advanced EEG telemetry.',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
    },
    {
      email: 'doctor.chen@hmis.local',
      firstName: 'Dr. Wei',
      lastName: 'Chen',
      deptCode: 'PED',
      specialization: 'Pediatric Pulmonology',
      licenseNumber: 'MD-PED-66120',
      qualification: 'MD, FAAP, Stanford University',
      experienceYears: 10,
      consultationFee: 120.00,
      roomNumber: 'Room 205',
      bio: 'Dedicated to childhood asthma, respiratory allergies, and developmental wellness.',
      avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150',
    },
    {
      email: 'doctor.rodriguez@hmis.local',
      firstName: 'Dr. Sofia',
      lastName: 'Rodriguez',
      deptCode: 'ORTH',
      specialization: 'Orthopedic & Joint Reconstruction',
      licenseNumber: 'MD-ORTH-55289',
      qualification: 'MD, Mayo Clinic Alix School of Medicine',
      experienceYears: 14,
      consultationFee: 160.00,
      roomNumber: 'Room 118',
      bio: 'Expert in arthroscopic joint surgery, sports injury rehabilitation, and hip/knee arthroplasty.',
      avatar: 'https://images.unsplash.com/photo-1594824813576-905f884260f9?w=150',
    },
    {
      email: 'doctor.taylor@hmis.local',
      firstName: 'Dr. Benjamin',
      lastName: 'Taylor',
      deptCode: 'GEN',
      specialization: 'Internal Medicine',
      licenseNumber: 'MD-GEN-44901',
      qualification: 'MD, Columbia University Vagelos College',
      experienceYears: 18,
      consultationFee: 100.00,
      roomNumber: 'Room 101',
      bio: 'Holistic chronic disease management (diabetes, hypertension) and executive health checkups.',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150',
    },
  ];

  const doctors: any[] = [];
  for (const doc of doctorsList) {
    const user = await prisma.user.create({
      data: {
        email: doc.email,
        passwordHash: defaultPassword,
        firstName: doc.firstName,
        lastName: doc.lastName,
        role: UserRole.DOCTOR,
        avatar: doc.avatar,
        phone: '+1 (555) 012-0000',
      },
    });

    const doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        departmentId: departments[doc.deptCode].id,
        specialization: doc.specialization,
        licenseNumber: doc.licenseNumber,
        qualification: doc.qualification,
        experienceYears: doc.experienceYears,
        consultationFee: doc.consultationFee,
        roomNumber: doc.roomNumber,
        bio: doc.bio,
      },
      include: { user: true, department: true },
    });

    // Create weekly schedule: Monday to Friday (days 1 to 5)
    for (let day = 1; day <= 5; day++) {
      await prisma.doctorSchedule.create({
        data: {
          doctorId: doctor.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: 30,
          maxPatients: 16,
        },
      });
    }

    doctors.push(doctor);
  }

  // --------------------------------------------------------------------------
  // 5. WARDS, ROOMS & BEDS
  // --------------------------------------------------------------------------
  const wardConfigs = [
    { name: 'Cardiology Intensive Care', type: WardType.ICU, floor: 3, roomCount: 3, bedsPerRoom: 2, rate: 350.00 },
    { name: 'General Medical Ward A', type: WardType.GENERAL, floor: 2, roomCount: 4, bedsPerRoom: 3, rate: 120.00 },
    { name: 'Surgical Recovery Ward', type: WardType.SURGICAL, floor: 2, roomCount: 3, bedsPerRoom: 2, rate: 220.00 },
    { name: 'Pediatric Care Ward', type: WardType.PEDIATRIC, floor: 1, roomCount: 3, bedsPerRoom: 2, rate: 180.00 },
  ];

  const beds: any[] = [];
  for (const wc of wardConfigs) {
    const ward = await prisma.ward.create({
      data: {
        name: wc.name,
        type: wc.type,
        floor: wc.floor,
        description: `Floor ${wc.floor} specialized inpatient wing`,
      },
    });

    for (let r = 1; r <= wc.roomCount; r++) {
      const roomNum = `${wc.floor}0${r}`;
      const room = await prisma.room.create({
        data: {
          wardId: ward.id,
          roomNumber: roomNum,
          roomType: wc.type === WardType.ICU ? RoomType.PRIVATE : RoomType.STANDARD,
          dailyRate: wc.rate,
        },
      });

      for (let b = 1; b <= wc.bedsPerRoom; b++) {
        const bedLetter = String.fromCharCode(64 + b);
        const bed = await prisma.bed.create({
          data: {
            roomId: room.id,
            bedNumber: `${roomNum}-${bedLetter}`,
            status: BedStatus.AVAILABLE,
          },
        });
        beds.push(bed);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. MEDICINES & INVENTORY
  // --------------------------------------------------------------------------
  const medicinesData = [
    { code: 'MED-001', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin Trihydrate', category: 'Antibiotic', form: MedicineForm.CAPSULE, strength: '500mg', manufacturer: 'Pfizer Inc.', unitPrice: 14.50, reorderLevel: 100, stock: 450 },
    { code: 'MED-002', name: 'Atorvastatin 20mg', genericName: 'Atorvastatin Calcium', category: 'Cardiovascular', form: MedicineForm.TABLET, strength: '20mg', manufacturer: 'Viatris', unitPrice: 22.00, reorderLevel: 50, stock: 240 },
    { code: 'MED-003', name: 'Metformin 850mg', genericName: 'Metformin Hydrochloride', category: 'Antidiabetic', form: MedicineForm.TABLET, strength: '850mg', manufacturer: 'Merck Healthcare', unitPrice: 12.00, reorderLevel: 80, stock: 320 },
    { code: 'MED-004', name: 'Lisinopril 10mg', genericName: 'Lisinopril Dihydrate', category: 'Antihypertensive', form: MedicineForm.TABLET, strength: '10mg', manufacturer: 'AstraZeneca', unitPrice: 18.00, reorderLevel: 60, stock: 190 },
    { code: 'MED-005', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'Analgesic / NSAID', form: MedicineForm.TABLET, strength: '400mg', manufacturer: 'GSK Consumer', unitPrice: 8.50, reorderLevel: 120, stock: 580 },
    { code: 'MED-006', name: 'Paracetamol 650mg', genericName: 'Acetaminophen', category: 'Antipyretic', form: MedicineForm.TABLET, strength: '650mg', manufacturer: 'Sanofi Aventis', unitPrice: 5.00, reorderLevel: 150, stock: 25 }, // Low stock trigger!
    { code: 'MED-007', name: 'Omeprazole 20mg', genericName: 'Omeprazole Delayed Release', category: 'Gastrointestinal', form: MedicineForm.CAPSULE, strength: '20mg', manufacturer: 'AstraZeneca', unitPrice: 16.00, reorderLevel: 75, stock: 210 },
    { code: 'MED-008', name: 'Azithromycin 250mg', genericName: 'Azithromycin Monohydrate', category: 'Antibiotic', form: MedicineForm.TABLET, strength: '250mg', manufacturer: 'Teva Pharmaceuticals', unitPrice: 26.00, reorderLevel: 50, stock: 18 }, // Low stock!
    { code: 'MED-009', name: 'Salbutamol Inhaler', genericName: 'Albuterol Sulfate', category: 'Respiratory', form: MedicineForm.INHALER, strength: '100mcg/dose', manufacturer: 'GSK', unitPrice: 35.00, reorderLevel: 30, stock: 85 },
    { code: 'MED-010', name: 'Ceftriaxone 1g Vial', genericName: 'Ceftriaxone Sodium', category: 'Injectable Antibiotic', form: MedicineForm.INJECTION, strength: '1g', manufacturer: 'Roche Diagnostics', unitPrice: 45.00, reorderLevel: 25, stock: 95 },
  ];

  const medicines: Record<string, any> = {};
  for (const m of medicinesData) {
    const med = await prisma.medicine.create({
      data: {
        code: m.code,
        name: m.name,
        genericName: m.genericName,
        category: m.category,
        form: m.form,
        strength: m.strength,
        manufacturer: m.manufacturer,
        unitPrice: m.unitPrice,
        reorderLevel: m.reorderLevel,
      },
    });

    // Create inventory record
    await prisma.inventory.create({
      data: {
        medicineId: med.id,
        batchNumber: `BATCH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        expiryDate: new Date('2027-12-31'),
        quantityInStock: m.stock,
        location: `Shelf ${m.category.charAt(0)}-${Math.floor(1 + Math.random() * 5)}`,
        purchaseCost: Number(m.unitPrice) * 0.65,
      },
    });

    medicines[m.code] = med;
  }

  // --------------------------------------------------------------------------
  // 7. LAB TESTS
  // --------------------------------------------------------------------------
  const labTestsData = [
    { testCode: 'LAB-CBC-01', name: 'Complete Blood Count (CBC)', category: 'Hematology', sampleType: 'Whole Blood (EDTA)', normalRange: 'WBC: 4.5-11.0, RBC: 4.3-5.9', unit: 'x10^3/uL', price: 45.00, turnaroundHours: 12, description: 'Automated 5-part differential blood panel' },
    { testCode: 'LAB-LIP-02', name: 'Comprehensive Lipid Profile', category: 'Biochemistry', sampleType: 'Serum', normalRange: 'Total Chol: <200, LDL: <100, HDL: >40', unit: 'mg/dL', price: 65.00, turnaroundHours: 24, description: 'Fasting lipid analysis for cardiovascular assessment' },
    { testCode: 'LAB-GLU-03', name: 'Fasting Plasma Glucose (FPG)', category: 'Biochemistry', sampleType: 'Fluoride Plasma', normalRange: '70 - 99', unit: 'mg/dL', price: 25.00, turnaroundHours: 6, description: 'Diagnostic test for prediabetes and diabetes mellitus' },
    { testCode: 'LAB-KFT-04', name: 'Kidney Function Test (KFT)', category: 'Biochemistry', sampleType: 'Serum', normalRange: 'Creatinine: 0.7-1.3, BUN: 7-20', unit: 'mg/dL', price: 75.00, turnaroundHours: 24, description: 'Serum creatinine, blood urea nitrogen, electrolytes' },
    { testCode: 'LAB-LFT-05', name: 'Liver Function Test (LFT)', category: 'Biochemistry', sampleType: 'Serum', normalRange: 'ALT: 7-56, AST: 10-40, Bilirubin: 0.1-1.2', unit: 'U/L', price: 80.00, turnaroundHours: 24, description: 'Hepatic enzyme and protein evaluation' },
    { testCode: 'LAB-URN-06', name: 'Routine Urinalysis & Microscopy', category: 'Clinical Pathology', sampleType: 'Urine', normalRange: 'Clear, pH 5.0-7.5, Protein Neg', unit: 'pH', price: 30.00, turnaroundHours: 4, description: 'Chemical and microscopic evaluation of urine' },
  ];

  const labTests: Record<string, any> = {};
  for (const lt of labTestsData) {
    labTests[lt.testCode] = await prisma.labTest.create({ data: lt });
  }

  // --------------------------------------------------------------------------
  // 8. 50 REALISTIC PATIENTS
  // --------------------------------------------------------------------------
  const sampleFirstNames = [
    'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
    'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
    'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
    'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Melissa', 'George', 'Deborah',
    'Timothy', 'Stephanie'
  ];

  const sampleLastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts'
  ];

  const bloodGroups: BloodGroup[] = [
    BloodGroup.A_POSITIVE, BloodGroup.O_POSITIVE, BloodGroup.B_POSITIVE, BloodGroup.AB_POSITIVE,
    BloodGroup.A_NEGATIVE, BloodGroup.O_NEGATIVE, BloodGroup.B_NEGATIVE, BloodGroup.AB_NEGATIVE
  ];

  const allergySamples = [
    [],
    ['Penicillin'],
    ['Sulfa Drugs', 'Latex'],
    ['Aspirin', 'NSAIDs'],
    ['Peanuts', 'Shellfish'],
    ['Ciprofloxacin'],
  ];

  const chronicConditionsSamples = [
    [],
    ['Type 2 Diabetes Mellitus'],
    ['Essential Hypertension'],
    ['Bronchial Asthma'],
    ['Hyperlipidemia', 'Hypertension'],
    ['Coronary Artery Disease'],
  ];

  const patients: any[] = [];
  for (let i = 0; i < 50; i++) {
    const fn = sampleFirstNames[i];
    const ln = sampleLastNames[i];
    const gender = i % 2 === 0 ? Gender.MALE : Gender.FEMALE;
    const birthYear = 1950 + Math.floor(Math.random() * 50);
    const birthMonth = Math.floor(Math.random() * 12);
    const birthDay = 1 + Math.floor(Math.random() * 28);
    const mrn = `MRN-2026-${String(i + 1).padStart(4, '0')}`;

    // Create user account for first patient as demo
    let patientUserId: string | undefined = undefined;
    if (i === 0) {
      const pUser = await prisma.user.create({
        data: {
          email: 'patient.james@hmis.local',
          passwordHash: defaultPassword,
          firstName: fn,
          lastName: ln,
          role: UserRole.PATIENT,
          phone: `+1 (555) 234-${String(1000 + i)}`,
        },
      });
      patientUserId = pUser.id;
    }

    const patient = await prisma.patient.create({
      data: {
        userId: patientUserId,
        mrn: mrn,
        firstName: fn,
        lastName: ln,
        dateOfBirth: new Date(birthYear, birthMonth, birthDay),
        gender: gender,
        bloodGroup: bloodGroups[i % bloodGroups.length],
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        phone: `+1 (555) 234-${String(1000 + i)}`,
        address: `${100 + i * 4} Metro Health Avenue`,
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        emergencyContactName: `${ln} Family Member`,
        emergencyContactPhone: `+1 (555) 888-${String(2000 + i)}`,
        emergencyContactRelation: i % 2 === 0 ? 'Spouse' : 'Parent',
        allergies: allergySamples[i % allergySamples.length],
        chronicConditions: chronicConditionsSamples[i % chronicConditionsSamples.length],
        insuranceProvider: i % 3 === 0 ? 'BlueCross BlueShield' : i % 3 === 1 ? 'Aetna Health' : 'UnitedHealthcare',
        insurancePolicyNumber: `POL-${800000 + i * 142}`,
      },
    });

    patients.push(patient);
  }

  console.log(`✅ Seeded 50 Patients with medical profiles.`);

  // --------------------------------------------------------------------------
  // 9. APPOINTMENTS, CONSULTATIONS, VITALS, DIAGNOSES, PRESCRIPTIONS
  // --------------------------------------------------------------------------
  const appointmentDates = [
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (completed)
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday (completed)
    new Date(),                                     // Today (in-progress/scheduled)
    new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow (scheduled)
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days (confirmed)
  ];

  const consultationNotesSamples = [
    {
      symptoms: ['Chest tightness on exertion', 'Shortness of breath for 2 weeks', 'Mild palpitations'],
      notes: 'Patient presents with progressive dyspnea upon mild exertion. No acute crushing pain.',
      diagnosisText: 'Exertional Angina Pectoris; Stage 1 Hypertension',
      treatmentPlan: 'Prescribed Atorvastatin and Lisinopril. Ordered Lipid panel and ECG follow-up.',
    },
    {
      symptoms: ['Persistent throbbing headache (unilateral)', 'Photophobia', 'Nausea in morning'],
      notes: 'Episodic migraine without aura lasting 24-48 hours. Aggravated by screen exposure.',
      diagnosisText: 'Episodic Migraine without Aura',
      treatmentPlan: 'Rest in dark room during onset. Ibuprofen 400mg PRN. Maintain headache diary.',
    },
    {
      symptoms: ['Wheezing', 'Nocturnal dry cough', 'Exercise intolerance'],
      notes: 'Bilateral expiratory wheezes noted on auscultation. Normal oxygen saturation.',
      diagnosisText: 'Moderate Persistent Allergic Asthma',
      treatmentPlan: 'Salbutamol Inhaler 2 puffs Q4H PRN. Avoid domestic dust and pet dander.',
    },
    {
      symptoms: ['Right knee pain and swelling', 'Stiffness after prolonged sitting'],
      notes: 'Crepitus in right patellofemoral joint. No ligamentous instability on Lachman test.',
      diagnosisText: 'Primary Osteoarthritis of Right Knee',
      treatmentPlan: 'Physical therapy referral for quadriceps strengthening. Paracetamol 650mg for pain.',
    },
    {
      symptoms: ['Elevated fasting blood sugar', 'Polydipsia', 'Generalized fatigue'],
      notes: 'HbA1c measured at 7.8% outside clinic. Elevated BMI (29.4 kg/m²).',
      diagnosisText: 'Type 2 Diabetes Mellitus; Obesity Class I',
      treatmentPlan: 'Metformin 850mg twice daily with meals. Dietary consultation scheduled.',
    },
  ];

  for (let i = 0; i < 20; i++) {
    const patient = patients[i];
    const doctor = doctors[i % doctors.length];
    const dateIdx = i % appointmentDates.length;
    const aptDate = appointmentDates[dateIdx];
    const hour = 9 + (i % 7);
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endTime = `${String(hour).padStart(2, '0')}:30`;

    let status: AppointmentStatus = AppointmentStatus.CONFIRMED;
    if (dateIdx <= 1) {
      status = AppointmentStatus.COMPLETED;
    } else if (dateIdx === 2) {
      status = i % 2 === 0 ? AppointmentStatus.IN_PROGRESS : AppointmentStatus.CHECKED_IN;
    } else if (i === 18) {
      status = AppointmentStatus.CANCELLED;
    }

    const appointment = await prisma.appointment.create({
      data: {
        appointmentNumber: `APT-2026-${String(i + 1).padStart(4, '0')}`,
        patientId: patient.id,
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
        appointmentDate: aptDate,
        startTime: startTime,
        endTime: endTime,
        type: i % 4 === 0 ? AppointmentType.FOLLOW_UP : AppointmentType.CONSULTATION,
        status: status,
        reason: 'Regular clinical review and assessment',
        queueNumber: (i % 10) + 1,
      },
    });

    // If completed or in progress, create consultation and clinical records
    if (status === AppointmentStatus.COMPLETED || status === AppointmentStatus.IN_PROGRESS) {
      const sampleNote = consultationNotesSamples[i % consultationNotesSamples.length];

      const consultation = await prisma.consultation.create({
        data: {
          appointmentId: appointment.id,
          patientId: patient.id,
          doctorId: doctor.id,
          consultationDate: aptDate,
          symptoms: sampleNote.symptoms,
          clinicalNotes: sampleNote.notes,
          diagnosisText: sampleNote.diagnosisText,
          treatmentPlan: sampleNote.treatmentPlan,
          followUpDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: status === AppointmentStatus.COMPLETED ? ConsultationStatus.COMPLETED : ConsultationStatus.IN_PROGRESS,
        },
      });

      // Record Vitals
      const bpSystolic = 115 + Math.floor(Math.random() * 30);
      const bpDiastolic = 70 + Math.floor(Math.random() * 20);
      const heartRate = 68 + Math.floor(Math.random() * 22);
      const temp = 36.5 + (Math.floor(Math.random() * 10) / 10);
      const resp = 14 + Math.floor(Math.random() * 6);
      const spo2 = 97 + Math.floor(Math.random() * 3);
      const weight = 65.0 + Math.floor(Math.random() * 25);
      const height = 165.0 + Math.floor(Math.random() * 20);
      const bmi = weight / Math.pow(height / 100, 2);

      await prisma.vital.create({
        data: {
          patientId: patient.id,
          consultationId: consultation.id,
          recordedAt: aptDate,
          bloodPressureSystolic: bpSystolic,
          bloodPressureDiastolic: bpDiastolic,
          heartRate: heartRate,
          temperature: temp,
          respiratoryRate: resp,
          oxygenSaturation: spo2,
          weightKg: weight,
          heightCm: height,
          bmi: Number(bmi.toFixed(1)),
          notes: 'Routine pre-consultation nursing vitals assessment',
        },
      });

      // Record Diagnosis
      await prisma.diagnosis.create({
        data: {
          patientId: patient.id,
          consultationId: consultation.id,
          conditionName: sampleNote.diagnosisText.split(';')[0],
          diagnosisType: 'PRIMARY',
          diagnosedAt: aptDate,
        },
      });

      // Create Medical Record entry
      await prisma.medicalRecord.create({
        data: {
          recordNumber: `EMR-2026-${String(i + 1).padStart(4, '0')}`,
          patientId: patient.id,
          doctorId: doctor.id,
          departmentId: doctor.departmentId,
          recordType: 'CONSULTATION',
          title: `Consultation with ${doctor.user.lastName} (${doctor.specialization})`,
          description: sampleNote.diagnosisText,
          recordDate: aptDate,
          metadata: {
            bp: `${bpSystolic}/${bpDiastolic}`,
            heartRate: heartRate,
            bmi: bmi.toFixed(1),
          },
        },
      });

      // Issue Prescription
      const prescription = await prisma.prescription.create({
        data: {
          prescriptionNumber: `RX-2026-${String(i + 1).padStart(4, '0')}`,
          patientId: patient.id,
          doctorId: doctor.id,
          consultationId: consultation.id,
          issuedDate: aptDate,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: PrescriptionStatus.ACTIVE,
          notes: 'Take medications with plenty of water. Report any allergic rash immediately.',
        },
      });

      // Add 2 items to prescription
      const medKeys = Object.keys(medicines);
      const med1 = medicines[medKeys[i % medKeys.length]];
      const med2 = medicines[medKeys[(i + 2) % medKeys.length]];

      await prisma.prescriptionItem.create({
        data: {
          prescriptionId: prescription.id,
          medicineId: med1.id,
          medicineName: med1.name,
          dosage: '1 tablet',
          frequency: 'Once daily after breakfast',
          route: 'Oral',
          durationDays: 14,
          instructions: 'Continue for full course',
        },
      });

      await prisma.prescriptionItem.create({
        data: {
          prescriptionId: prescription.id,
          medicineId: med2.id,
          medicineName: med2.name,
          dosage: '1 tablet',
          frequency: 'Twice daily after meals',
          route: 'Oral',
          durationDays: 7,
          instructions: 'Take as needed for symptoms',
        },
      });

      // Lab Order for every 2nd completed consultation
      if (i % 2 === 0) {
        const labOrder = await prisma.labOrder.create({
          data: {
            orderNumber: `LAB-2026-${String(i + 1).padStart(4, '0')}`,
            patientId: patient.id,
            doctorId: doctor.id,
            consultationId: consultation.id,
            priority: i % 3 === 0 ? LabPriority.URGENT : LabPriority.NORMAL,
            status: LabOrderStatus.VERIFIED,
            orderedAt: aptDate,
            sampleCollectedAt: new Date(aptDate.getTime() + 2 * 60 * 60 * 1000),
            completedAt: new Date(aptDate.getTime() + 5 * 60 * 60 * 1000),
            verifiedAt: new Date(aptDate.getTime() + 6 * 60 * 60 * 1000),
            verifiedById: staffLabTech.id,
            clinicalNotes: 'Evaluate metabolic baseline parameters',
          },
        });

        // Add Lab Result
        const testCode = i % 4 === 0 ? 'LAB-CBC-01' : 'LAB-LIP-02';
        const test = labTests[testCode];
        await prisma.labResult.create({
          data: {
            labOrderId: labOrder.id,
            labTestId: test.id,
            value: testCode === 'LAB-CBC-01' ? '7.4' : '185',
            unit: test.unit,
            referenceRange: test.normalRange,
            flag: ResultFlag.NORMAL,
            remarks: 'Parameters within normal diagnostic expectations',
            technicianId: staffLabTech.id,
          },
        });
      }

      // Billing Invoice
      const fee = Number(doctor.consultationFee);
      const tax = fee * 0.05;
      const total = fee + tax;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-2026-${String(i + 1).padStart(4, '0')}`,
          patientId: patient.id,
          appointmentId: appointment.id,
          totalAmount: total,
          taxAmount: tax,
          discountAmount: 0,
          payableAmount: total,
          paidAmount: status === AppointmentStatus.COMPLETED ? total : 0,
          status: status === AppointmentStatus.COMPLETED ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          itemType: InvoiceItemType.CONSULTATION,
          description: `Specialist Consultation - ${doctor.specialization}`,
          quantity: 1,
          unitPrice: fee,
          totalPrice: fee,
        },
      });

      if (status === AppointmentStatus.COMPLETED) {
        await prisma.payment.create({
          data: {
            paymentNumber: `PAY-2026-${String(i + 1).padStart(4, '0')}`,
            invoiceId: invoice.id,
            amount: total,
            paymentMethod: i % 2 === 0 ? PaymentMethod.CREDIT_CARD : PaymentMethod.UPI,
            status: PaymentStatus.SUCCESS,
            transactionReference: `TXN-${100000 + i * 8371}`,
            receivedById: staffAccountant.id,
          },
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // 10. INPATIENT ADMISSIONS
  // --------------------------------------------------------------------------
  const admittedPatients = [patients[25], patients[26], patients[27], patients[28]];
  for (let a = 0; a < admittedPatients.length; a++) {
    const p = admittedPatients[a];
    const bed = beds[a];
    const doctor = doctors[a % doctors.length];

    await prisma.bed.update({
      where: { id: bed.id },
      data: { status: BedStatus.OCCUPIED },
    });

    await prisma.admission.create({
      data: {
        admissionNumber: `ADM-2026-${String(a + 1).padStart(4, '0')}`,
        patientId: p.id,
        bedId: bed.id,
        attendingDoctorId: doctor.id,
        admissionDate: new Date(Date.now() - (a + 1) * 24 * 60 * 60 * 1000),
        expectedDischargeDate: new Date(Date.now() + (3 - a) * 24 * 60 * 60 * 1000),
        admissionType: a === 0 ? AdmissionType.EMERGENCY : AdmissionType.PLANNED,
        reasonForAdmission: a === 0 ? 'Acute Coronary Syndrome observation' : 'Post-operative orthopedic rehabilitation',
        diagnosisAtAdmission: a === 0 ? 'Unstable Angina' : 'Total Hip Arthroplasty Recovery',
        status: AdmissionStatus.ADMITTED,
      },
    });
  }

  // --------------------------------------------------------------------------
  // 11. NOTIFICATIONS & AUDIT LOGS
  // --------------------------------------------------------------------------
  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        title: 'Low Medicine Stock Alert',
        message: 'Paracetamol 650mg inventory is down to 25 units (Reorder level: 150).',
        type: NotificationType.WARNING,
        link: '/pharmacy',
      },
      {
        userId: adminUser.id,
        title: 'New Inpatient Admission',
        message: 'Patient Robert Williams admitted to Cardiology Intensive Care Bed 301-A.',
        type: NotificationType.INFO,
        link: '/admissions',
      },
      {
        userId: doctors[0].userId,
        title: 'Lab Report Verified',
        message: 'Verified CBC report available for patient James Smith (MRN-2026-0001).',
        type: NotificationType.SUCCESS,
        link: '/laboratory',
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'USER_LOGIN',
        resource: 'AUTH',
        ipAddress: '127.0.0.1',
        metadata: { browser: 'Chrome 128', os: 'Windows 11' },
      },
      {
        userId: doctors[0].userId,
        action: 'CONSULTATION_COMPLETED',
        resource: 'CONSULTATION',
        ipAddress: '192.168.1.45',
        metadata: { patientMrn: 'MRN-2026-0001', durationMinutes: 25 },
      },
      {
        userId: staffPharmacist.id,
        action: 'PHARMACY_STOCK_ALERT',
        resource: 'MEDICINE',
        resourceId: medicines['MED-006'].id,
        ipAddress: '192.168.1.60',
        metadata: { medicine: 'Paracetamol 650mg', remaining: 25 },
      },
      {
        userId: staffLabTech.id,
        action: 'LAB_RESULT_VERIFIED',
        resource: 'LAB_ORDER',
        ipAddress: '192.168.1.72',
        metadata: { orderNumber: 'LAB-2026-0001' },
      },
    ],
  });

  console.log('🎉 Seeding successfully completed!');
  console.log('--------------------------------------------------------------');
  console.log('Demo Credentials for instant login:');
  console.log('Super Admin:    admin@hmis.local        / Admin@123456');
  console.log('Cardiologist:   doctor.carter@hmis.local / Password@123');
  console.log('Staff Nurse:    nurse.sarah@hmis.local   / Password@123');
  console.log('Receptionist:   receptionist@hmis.local  / Password@123');
  console.log('Pharmacist:     pharmacist@hmis.local    / Password@123');
  console.log('Lab Tech:       labtech@hmis.local       / Password@123');
  console.log('Accountant:     accountant@hmis.local    / Password@123');
  console.log('Patient:        patient.james@hmis.local / Password@123');
  console.log('--------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
