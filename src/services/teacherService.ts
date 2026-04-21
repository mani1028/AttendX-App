import API from './api';

type AssignedClass = {
	class_grade: string;
	section: string;
};

type Student = {
	student_id: string;
	student_full_name: string;
	roll_number: string;
	class_grade: string;
	section: string;
	gender: string;
	student_status: 'ACTIVE' | 'INACTIVE';
	student_photograph?: string;
};

async function getFirstSuccessful<T>(endpoints: string[], params: Record<string, string>) {
	let lastError: unknown;

	for (const endpoint of endpoints) {
		try {
			const response = await API.get<T>(endpoint, { params });
			return response.data;
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}

export const teacherService = {
	async getAssignedClasses(schoolCode: string, branchId: string, employeeId: string): Promise<AssignedClass[]> {
		const data = (await getFirstSuccessful<any>(
			['/manage/teacher/assigned-classes', '/teacher/assigned-classes'],
			{
				school_code: schoolCode,
				branch_id: branchId,
				employee_id: employeeId,
			},
		)) as any;

		return data?.assigned_classes ?? data?.items ?? [];
	},

	async getStudentsByClass(
		schoolCode: string,
		branchId: string,
		classGrade: string,
		section: string,
	): Promise<Student[]> {
		const data = (await getFirstSuccessful<any>(
			['/manage/students', '/teacher/students'],
			{
				school_code: schoolCode,
				branch_id: branchId,
				class_grade: classGrade,
				section,
			},
		)) as any;

		return data?.students ?? data?.items ?? [];
	},
};
