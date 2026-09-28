export const universityInfo = {
  name: "GAYATRI VIDYA PARISHAD INSTITUTE OF HIGHER LEARNING AND RESEARCH",
  statusText: "(Deemed to be University under Distinct Category under Section 3 of the UGC Act, 1956)",
  address: "Kommadi, Madhurawada, Visakhapatnam, Andhra Pradesh - 530 048",
  academicYear: "2026-27",
  semester: "B.Tech 1st Sem",
  subTitle: "TENTATIVE TIME TABLE FOR THE ACADEMIC YEAR 2026-27, B.Tech. 1st Sem",
  version: "1.1",
  wef: "2026-27",
  logo: "/gvpihlr.png"
};

export const periodSlots = [
  { id: 'p1', time: '09:00-10:00', type: 'lecture' },
  { id: 'p2', time: '10:00-11:00', type: 'lecture' },
  { id: 'b1', time: '11:00-11:15', type: 'break', label: 'BREAK' },
  { id: 'p3', time: '11:15-12:15', type: 'lecture' },
  { id: 'p4', time: '12:15-01:15', type: 'lecture' },
  { id: 'b2', time: '01:15-02:15', type: 'break', label: 'LUNCH' },
  { id: 'p5', time: '02:15-03:15', type: 'lecture' },
  { id: 'p6', time: '03:15-04:15', type: 'lecture' },
];

export const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export const branches = [
  { id: 'CHEMICAL', name: 'CHEMICAL', fullName: 'Chemical Engineering' },
  { id: 'CSE-1', name: 'CSE-1', fullName: 'Computer Science & Engineering - 1' },
  { id: 'CSE-2', name: 'CSE-2', fullName: 'Computer Science & Engineering - 2' },
  { id: 'ECE-1', name: 'ECE-1', fullName: 'Electronics & Communication Engg - 1' },
  { id: 'CIVIL', name: 'CIVIL', fullName: 'Civil Engineering' },
  { id: 'EEE', name: 'EEE', fullName: 'Electrical & Electronics Engineering' },
  { id: 'MECH', name: 'MECHANICAL', fullName: 'Mechanical Engineering' }
];

export const sampleTimetableData = {
  CHEMICAL: {
    MON: {
      '09:00-10:00': [
        { subject: 'PCE LAB', faculty: 'Dr. S Padma, Dr. KV NagaLakshmi, Dr. M Rama Rajeswari', room: 'CHEM. LAB-1', isLab: true },
        { subject: 'PAC LAB', faculty: 'Dr. KV NagaLakshmi, Mr. S Ashok, Dr. KV Padmavathi', room: 'CHEM. LAB.', isLab: true }
      ],
      '10:00-11:00': [
        { subject: 'PCE LAB', faculty: 'Dr. S Padma, Dr. KV NagaLakshmi, Dr. M Rama Rajeswari', room: 'CHEM. LAB-1', isLab: true },
        { subject: 'PAC LAB', faculty: 'Dr. KV NagaLakshmi, Mr. S Ashok, Dr. KV Padmavathi', room: 'CHEM. LAB.', isLab: true }
      ],
      '11:15-12:15': [
        { subject: 'PSUC', faculty: 'Mrs. DMV Priya', room: 'E-311', isLab: false }
      ],
      '12:15-01:15': [
        { subject: 'AITA', faculty: 'Mr. K AyyaRaju', room: 'E-311', isLab: false }
      ],
      '02:15-03:15': [
        { subject: 'PAC LAB', faculty: 'Dr. KV NagaLakshmi, Mr. S Ashok, Dr. KV Padmavathi', room: 'CHEM. LAB.', isLab: true },
        { subject: 'PCE LAB', faculty: 'Dr. S Padma, Dr. KV NagaLakshmi, Dr. M Rama Rajeswari', room: 'CHEM. LAB-1', isLab: true }
      ],
      '03:15-04:15': [
        { subject: 'PAC LAB', faculty: 'Dr. KV NagaLakshmi, Mr. S Ashok, Dr. KV Padmavathi', room: 'CHEM. LAB.', isLab: true },
        { subject: 'PCE LAB', faculty: 'Dr. S Padma, Dr. KV NagaLakshmi, Dr. M Rama Rajeswari', room: 'CHEM. LAB-1', isLab: true }
      ]
    },
    TUE: {
      '09:00-10:00': [
        { subject: 'PAC', faculty: 'Dr. KV NagaLakshmi', room: 'E-311', isLab: false }
      ],
      '10:00-11:00': [
        { subject: 'CAL & LA', faculty: 'Dr. A Suseelatha', room: 'E-311', isLab: false }
      ],
      '11:15-12:15': [
        { subject: 'PCE', faculty: 'Dr. S Padma', room: 'E-311', isLab: false }
      ],
      '12:15-01:15': [
        { subject: 'ESS. ENG. Tut.', faculty: 'Mr. PBS Krishnam Raju', room: 'E-311', isLab: false }
      ],
      '02:15-03:15': [
        { subject: 'ESS. ENG. LAB', faculty: 'Mr. PBS Krishnam Raju, Dr. I Rajasekhar, Dr. VVL Usha Ramani', room: 'ENG LAB', isLab: true }
      ],
      '03:15-04:15': [
        { subject: 'ESS. ENG. LAB', faculty: 'Mr. PBS Krishnam Raju, Dr. I Rajasekhar, Dr. VVL Usha Ramani', room: 'ENG LAB', isLab: true }
      ]
    },
    WED: {
      '09:00-10:00': [
        { subject: 'SUS. ENGG.', faculty: 'Dr. G Santosh Kumar', room: 'E-311', isLab: false }
      ],
      '10:00-11:00': [
        { subject: 'PCE', faculty: 'Dr. S Padma', room: 'E-311', isLab: false }
      ],
      '11:15-12:15': [
        { subject: 'AITA LAB', faculty: 'Mr. K AyyaRaju, Dr. V Adinarayana, Dr. I Srinivas Rao', room: 'COMP. LAB-2', isLab: true }
      ],
      '12:15-01:15': [
        { subject: 'AITA LAB', faculty: 'Mr. K AyyaRaju, Dr. V Adinarayana, Dr. I Srinivas Rao', room: 'COMP. LAB-2', isLab: true }
      ],
      '02:15-03:15': [
        { subject: 'PAC', faculty: 'Dr. KV NagaLakshmi', room: 'E-311', isLab: false }
      ],
      '03:15-04:15': [
        { subject: 'CAL & LA Tut.', faculty: 'Dr. A Suseelatha', room: 'E-311', isLab: false },
        { subject: 'COUNSELLING', faculty: 'Faculty Advisors', room: 'E-311', isLab: false }
      ]
    },
    THU: {
      '09:00-10:00': [
        { subject: 'CAL & LA', faculty: 'Dr. A Suseelatha', room: 'E-311', isLab: false }
      ],
      '10:00-11:00': [
        { subject: 'SUS. ENGG.', faculty: 'Dr. G Santosh Kumar', room: 'E-311', isLab: false }
      ],
      '11:15-12:15': [
        { subject: 'PSUC', faculty: 'Mrs. DMV Priya', room: 'E-311', isLab: false }
      ],
      '12:15-01:15': [
        { subject: 'PCE', faculty: 'Dr. S Padma', room: 'E-311', isLab: false }
      ],
      '02:15-03:15': [
        { subject: 'PAC', faculty: 'Dr. KV NagaLakshmi', room: 'E-311', isLab: false }
      ],
      '03:15-04:15': [
        { subject: 'YOGA / SPORTS', faculty: 'Physical Director', room: 'GROUND', isLab: false },
        { subject: 'LIBRARY', faculty: 'Library Incharge', room: 'LIBRARY', isLab: false }
      ]
    },
    FRI: {
      '09:00-10:00': [
        { subject: 'PSUC LAB', faculty: 'Mrs. DMV Priya, Mrs. V Sridevi, Ms. K Manikyakanthi', room: 'COMP. LAB-1', isLab: true }
      ],
      '10:00-11:00': [
        { subject: 'PSUC LAB', faculty: 'Mrs. DMV Priya, Mrs. V Sridevi, Ms. K Manikyakanthi', room: 'COMP. LAB-1', isLab: true }
      ],
      '11:15-12:15': [
        { subject: 'CAL & LA', faculty: 'Dr. A Suseelatha', room: 'E-311', isLab: false }
      ],
      '12:15-01:15': [
        { subject: 'COUNSELLING', faculty: 'Faculty Advisors', room: 'E-311', isLab: false },
        { subject: 'CAL & LA Tut.', faculty: 'Dr. A Suseelatha', room: 'E-311', isLab: false }
      ],
      '02:15-03:15': [
        { subject: 'PSUC', faculty: 'Mrs. DMV Priya', room: 'E-311', isLab: false }
      ],
      '03:15-04:15': [
        { subject: 'LIBRARY', faculty: 'Library Incharge', room: 'LIBRARY', isLab: false },
        { subject: 'YOGA / SPORTS', faculty: 'Physical Director', room: 'GROUND', isLab: false }
      ]
    }
  }
};
