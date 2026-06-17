#!/bin/bash
DIR="src/screens/principal"

# 1. Themes
sed -i '' 's/Director_THEME/Principal_THEME/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/directorTheme/principalTheme/g' $DIR/*.tsx $DIR/*.ts

# 2. Navigation & Routes
sed -i '' 's/DirectorDashboard/PrincipalDashboard/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorTeacherManagement/PrincipalTeacherManagement/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorStudentManagement/PrincipalStudentManagement/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorAttendance/PrincipalAttendance/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorExams/PrincipalExams/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorReports/PrincipalReports/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorAnnouncements/PrincipalAnnouncements/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorSettings/PrincipalSettings/g' $DIR/*.tsx $DIR/*.ts

# 3. Component Names & Function Names
sed -i '' 's/DirectorAttendanceScreen/PrincipalAttendanceScreen/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorDataExportPage/PrincipalDataExportPage/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/DirectorSettingsPage/PrincipalSettingsPage/g' $DIR/*.tsx $DIR/*.ts

# 4. Service Imports
sed -i '' 's/directorService/principalService/g' $DIR/*.tsx $DIR/*.ts

# 5. Text Labels & API endpoints
sed -i '' 's/Director Portal/Principal Portal/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/Director Settings/Principal Settings/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/Good morning, Director/Good morning, Principal/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/Good afternoon, Director/Good afternoon, Principal/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/Good evening, Director/Good evening, Principal/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/Good {getGreeting()}, Director/Good {getGreeting()}, Principal/g' $DIR/*.tsx $DIR/*.ts

# 6. Generic director -> principal for endpoints and other stuff
# This is more aggressive but based on principalService.ts it seems correct for this folder
sed -i '' 's/\/director\//\/principal\//g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/\"director\//\"principal\//g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/ '\''director\// '\''principal\//g' $DIR/*.tsx $DIR/*.ts
# Also some cases where it's not at the start of string
sed -i '' 's/director\//principal\//g' $DIR/*.tsx $DIR/*.ts

# Cache keys
sed -i '' 's/director_stats/principal_stats/g' $DIR/*.tsx $DIR/*.ts
sed -i '' 's/director_classes/principal_classes/g' $DIR/*.tsx $DIR/*.ts
