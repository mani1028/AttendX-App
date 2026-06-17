#!/bin/bash
DIR="src/screens/principal"

# Method calls
sed -i '' 's/getDirectorTeachers/getPrincipalTeachers/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/getDirectorStats/getPrincipalStats/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/getDirectorClasses/getPrincipalClasses/g' $DIR/*.tsx $DIR/*.ts

# More component names
sed -i '' 's/DirectorTeacherAssignmentsScreen/PrincipalTeacherAssignmentsScreen/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorAttendanceScreen/PrincipalAttendanceScreen/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorDashboardScreen/PrincipalDashboardScreen/g' $DIR/*.tsx $DIR/*.ts

# Generic Director -> Principal where it's not Directory
# Use regex to match Director but not followed by y
sed -i '' 's/Director\([^y]\)/Principal\1/g' $DIR/*.tsx $DIR/*.ts
# Handle Director at end of line
sed -i '' 's/Director$/Principal/g' $DIR/*.tsx $DIR/*.ts
