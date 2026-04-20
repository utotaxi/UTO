const fs = require('fs');
const filepath = '../uto-admin-panel/src/app/login/page.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Remove the lg:w-1/2 class to make it full width
content = content.replace('w-full lg:w-1/2 flex items-center', 'w-full flex items-center');

// 2. Remove the right side image container
const rightSideStart = content.indexOf('{/* Right side: Splitted Image */}');
if (rightSideStart !== -1) {
    const endDiv = content.indexOf('</div>', content.indexOf('</Image>', rightSideStart) || content.indexOf('/>', rightSideStart));
    // basically we just want to replace everything from "Right side" to the </div> right before the final </div>
    // Let's use a regex instead
    const regex = /\{\/\* Right side: Splitted Image \*\/\}[\s\S]*?<\/div>(\r?\n\s*<\/div>\r?\n\s*\);\r?\n\})/;
    content = content.replace(regex, '$1');
}

fs.writeFileSync(filepath, content);
console.log("Successfully updated login page");
