import { auth } from './firebase-config.js';

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function isUserDataComplete(userId) {
    // Check if all required data exists in localStorage
    const physiqueData = localStorage.getItem(`physique_${userId}`);
    const nameData = localStorage.getItem(`name_${userId}`);
    const birthData = localStorage.getItem(`birth_${userId}`);
    const avatarData = localStorage.getItem(`avatar_${userId}`);

    return physiqueData && nameData && birthData && avatarData;
}

document.addEventListener('DOMContentLoaded', () => {
    const reloadButton = document.getElementById('reload-button');
    reloadButton.addEventListener('click', () => {
        window.location.reload();
    });

    const userData = {
        isQuestionnaireDone: false
    };

    // Modify the saveUserWorkout function to check for duplicates
    function saveUserWorkout(workout, category) {
        const userId = auth.currentUser.uid;
        let userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
        
        // Check if workout already exists
        if (userWorkouts.some(w => w.name === workout)) {
            return false; // Workout already exists
        }
        
        userWorkouts.push({
            name: workout,
            type: category,
            id: Date.now() // Use timestamp as unique ID
        });
        
        localStorage.setItem(`workouts_${userId}`, JSON.stringify(userWorkouts));
        updateWorkoutsList();
        return true; // Workout added successfully
    }

    function deleteUserWorkout(workoutId) {
        const userId = auth.currentUser.uid;
        let userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
        
        userWorkouts = userWorkouts.filter(workout => workout.id !== workoutId);
        
        localStorage.setItem(`workouts_${userId}`, JSON.stringify(userWorkouts));
        updateWorkoutsList();
    }

    function updateWorkoutsList() {
        const userId = auth.currentUser.uid;
        const workoutsContainer = document.querySelector('.workouts-container');
        const userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
        
        workoutsContainer.innerHTML = ''; // Clear existing workouts
        
        userWorkouts.forEach((workout, index) => {
            const workoutElement = document.createElement('div');
            workoutElement.className = 'workout-entry';
            workoutElement.style.animationDelay = `${index * 0.1}s`;
            
            workoutElement.innerHTML = `
                <div class="workout-info">
                    <div class="workout-name">${workout.name}</div>
                    <div class="workout-type">${workout.type}</div>
                </div>
                <button class="delete-workout" data-id="${workout.id}">
                    <img src="images/trash.png" alt="Delete">
                </button>
            `;
            
            workoutsContainer.appendChild(workoutElement);
        });

        // Add delete handlers
        document.querySelectorAll('.delete-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workoutId = parseInt(e.currentTarget.dataset.id);
                // Add delete animation
                const workoutEntry = e.currentTarget.closest('.workout-entry');
                workoutEntry.style.animation = 'slideOut 0.3s ease-out forwards';
                
                setTimeout(() => {
                    deleteUserWorkout(workoutId);
                }, 300);
            });
        });
    }

    // Check auth state and questionnaire status
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }
        
        // Check if all user data is complete
        if (!isUserDataComplete(user.uid)) {
            // Show questionnaire and disabled overlay
            document.body.classList.add('show-questionnaire');
            document.getElementById('disabled-overlay').style.display = 'block';
            document.getElementById('questionnaire-overlay').style.display = 'flex';
        } else {
            // Hide questionnaire and disabled overlay
            document.body.classList.remove('show-questionnaire');
            document.getElementById('disabled-overlay').style.display = 'none';
            document.getElementById('questionnaire-overlay').style.display = 'none';
            
            // Mark questionnaire as completed
            localStorage.setItem(`questionnaire_completed_${user.uid}`, 'true');
        }

        // Get stored name data
        const nameData = JSON.parse(localStorage.getItem(`name_${user.uid}`) || '{}');
        const firstName = nameData.firstName;
        
        // Use first name if available, otherwise fallback to email
        const displayName = firstName || user.email.split('@')[0];
        const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        const welcomeMessage = document.getElementById('welcome-message');
        welcomeMessage.textContent = `Welcome, ${capitalizedName}!`;
        updateAccountButtonImage();
        updateInfoCards();
    });

    // Sidebar functionality
    const menuButton = document.getElementById('menu-button');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    menuButton.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    function toggleSidebar() {
        // If right sidebar is open, close it first
        if (rightSidebar.classList.contains('active')) {
            rightSidebar.classList.remove('active');
            overlay.classList.remove('active-right');
        }
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    const sections = document.querySelectorAll('.section-content');

    function switchSection(sectionId) {
        // Hide all sections first
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show the selected section
        const targetSection = document.querySelector(`.section-content[data-section="${sectionId}"]`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update button states
        sidebarButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.section === sectionId) {
                btn.classList.add('active');
            }
        });

        // Close sidebar and overlay
        sidebar.classList.remove('active');
        overlay.classList.remove('active');

        if (sectionId === 'schedule') {
            updateScheduleDisplay();
        }
    }

    // Add click handlers for sidebar buttons
    sidebarButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.dataset.section;
            switchSection(sectionId);
        });
    });

    // Initialize home section as active
    switchSection('home');

    const physiqueForm = document.getElementById('physique-form');
    const nameSection = document.querySelector('.name-section');
    const physiqueSection = document.querySelector('.physique-section');

    // Rename this section switching function to avoid conflicts
    function switchQuestionnaireSection(fromSection, toSection, direction = 'forward') {
        const fadeOut = direction === 'forward' ? 'fadeOutLeft' : 'fadeOutRight';
        const fadeIn = direction === 'forward' ? 'fadeInRight' : 'fadeInLeft';
        
        fromSection.style.animation = `${fadeOut} 0.3s forwards`;
        setTimeout(() => {
            fromSection.style.display = 'none';
            toSection.style.display = 'block';
            toSection.style.animation = `${fadeIn} 0.3s forwards`;
        }, 300);
    }

    physiqueForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const height = document.getElementById('height');
        const weight = document.getElementById('weight');
        const metabolicRate = document.getElementById('metabolic-rate');
        let isValid = true;

        // Clear previous errors
        [height, weight, metabolicRate].forEach(input => input.classList.remove('error'));

        if (height.value < 100 || height.value > 250) {
            height.classList.add('error');
            isValid = false;
        }

        if (weight.value < 30 || weight.value > 300) {
            weight.classList.add('error');
            isValid = false;
        }

        if (metabolicRate.value < 800 || metabolicRate.value > 4000) {
            metabolicRate.classList.add('error');
            isValid = false;
        }

        if (!isValid) return;

        // Save physique data
        const userId = auth.currentUser.uid;
        const physiqueData = {
            height: parseFloat(height.value),
            weight: parseFloat(weight.value),
            metabolicRate: parseFloat(metabolicRate.value)
        };
        
        localStorage.setItem(`physique_${userId}`, JSON.stringify(physiqueData));
        
        // Transition to name section
        switchQuestionnaireSection(physiqueSection, nameSection, 'forward');
    });

    // Handle back button
    document.querySelector('.back-btn').addEventListener('click', () => {
        switchQuestionnaireSection(nameSection, physiqueSection, 'backward');
    });

    // Add necessary animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOutLeft {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(-10%);
            }
        }
        @keyframes fadeOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(10%);
            }
        }
        @keyframes fadeInRight {
            from {
                opacity: 0;
                transform: translateX(10%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        @keyframes fadeInLeft {
            from {
                opacity: 0;
                transform: translateX(-10%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    document.head.appendChild(style);

    // Handle name form submission
    const nameForm = document.getElementById('name-form');
    const birthSection = document.querySelector('.birth-section');
    const birthForm = document.getElementById('birth-form');
    
    nameForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const firstName = document.getElementById('first-name').value;
        const secondName = document.getElementById('second-name').value;
        const lastName = document.getElementById('last-name').value;

        const userId = auth.currentUser.uid;
        const nameData = {
            firstName,
            secondName,
            lastName,
        };

        localStorage.setItem(`name_${userId}`, JSON.stringify(nameData));

        // Transition to birth section instead of completing questionnaire
        switchQuestionnaireSection(nameSection, birthSection, 'forward');
    });

    // Handle birth form validation and submission
    birthForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const year = parseInt(document.getElementById('birth-year').value);
        const month = parseInt(document.getElementById('birth-month').value);
        const day = parseInt(document.getElementById('birth-day').value);
        
        const currentYear = new Date().getFullYear();
        let isValid = true;

        if (year < 1920 || year > currentYear) {
            document.getElementById('birth-year').classList.add('error');
            isValid = false;
        }

        if (day < 1 || day > 31) {
            document.getElementById('birth-day').classList.add('error');
            isValid = false;
        }

        if (!isValid) return;

        const userId = auth.currentUser.uid;
        const birthData = {
            year,
            month,
            day
        };

        localStorage.setItem(`birth_${userId}`, JSON.stringify(birthData));
        
        // Transition to avatar section instead of completing questionnaire
        switchQuestionnaireSection(birthSection, avatarSection, 'forward');
        
        // Update subtitle for last section
        document.querySelector('.subtitle').textContent = 'Last One';
    });

    // Handle avatar form
    const avatarSection = document.querySelector('.avatar-section');
    const avatarForm = document.getElementById('avatar-form');
    const profileUpload = document.getElementById('profile-upload');
    const profilePreview = document.getElementById('profile-preview');

    profileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    avatarForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userId = auth.currentUser.uid;
        const avatarData = {
            nickname: document.getElementById('nickname').value,
            gender: document.getElementById('gender').value,
            profilePicture: profilePreview.src
        };

        localStorage.setItem(`avatar_${userId}`, JSON.stringify(avatarData));
        updateAccountButtonImage();

        // Add closing animation
        const questionnaireContainer = document.querySelector('.questionnaire-container');
        questionnaireContainer.style.animation = 'slideDown 0.5s ease-out forwards';
        
        // Complete questionnaire with delay for animation
        setTimeout(() => {
            completeQuestionnaire();
        }, 500);
    });

    // Update back button handler to include avatar section
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.closest('.avatar-section')) {
                switchQuestionnaireSection(avatarSection, birthSection, 'backward');
                // Reset subtitle
                document.querySelector('.subtitle').textContent = 'Almost There...';
            } else if (btn.closest('.birth-section')) {
                switchQuestionnaireSection(birthSection, nameSection, 'backward');
            } else if (btn.closest('.name-section')) {
                switchQuestionnaireSection(nameSection, physiqueSection, 'backward');
            }
        });
    });

    // Add closing animation keyframe
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes slideDown {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(50px);
            }
        }
    `;
    document.head.appendChild(styleSheet);

    // Function to complete questionnaire
    function completeQuestionnaire() {
        userData.isQuestionnaireDone = true;
        const userId = auth.currentUser.uid;
        localStorage.setItem(`questionnaire_completed_${userId}`, 'true');
        
        document.getElementById('disabled-overlay').style.display = 'none';
        document.getElementById('questionnaire-overlay').style.display = 'none';
        
        // Show selection area with animation and update cards immediately
        const selectionArea = document.getElementById('selection-area');
        const infoCardsContainer = document.querySelector('.info-cards-container');
        
        selectionArea.classList.remove('hide-selection');
        infoCardsContainer.style.display = 'grid';
        infoCardsContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
        infoCardsContainer.style.gap = '2rem';
        infoCardsContainer.style.padding = '1rem';
        
        // Update cards immediately
        updateInfoCards();

        // Update cards after a small delay to ensure smooth transition
        setTimeout(() => {
            updateInfoCards();
        }, 300);
    }

    // Account button and right sidebar functionality
    const accountButton = document.getElementById('account-button');
    const accountButtonImage = document.getElementById('account-button-image');
    const rightSidebar = document.getElementById('right-sidebar');
    
    // Update account button image if profile picture exists
    function updateAccountButtonImage() {
        const userId = auth.currentUser?.uid;
        if (userId) {
            const avatarData = JSON.parse(localStorage.getItem(`avatar_${userId}`) || '{}');
            if (avatarData.profilePicture) {
                accountButtonImage.src = avatarData.profilePicture;
            }
        }
    }

    // Call this after auth state changes and after avatar form submission
    auth.onAuthStateChanged((user) => {
        updateAccountButtonImage();
    });

    accountButton.addEventListener('click', toggleRightSidebar);

    function toggleRightSidebar() {
        // If left sidebar is open, close it first
        if (sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
        rightSidebar.classList.toggle('active');
        overlay.classList.toggle('active-right');
    }

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        rightSidebar.classList.remove('active');
        overlay.classList.remove('active');
        overlay.classList.remove('active-right');
    });

    // Update avatar form submit handler to also update account button image
    avatarForm.addEventListener('submit', async (e) => {
        updateAccountButtonImage();
    });

    // Password toggle handler
    document.addEventListener('click', (e) => {
        if (e.target.closest('.toggle-password')) {
            const btn = e.target.closest('.toggle-password');
            const passwordText = btn.parentElement.querySelector('.password-text');
            const isHidden = passwordText.textContent === '••••••••';
            
            if (isHidden && passwordText.dataset.password) {
                passwordText.textContent = passwordText.dataset.password;
                btn.querySelector('img').style.opacity = '0.5';
            } else {
                passwordText.textContent = '••••••••';
                btn.querySelector('img').style.opacity = '1';
            }
        }
    });

    // Add workout button handler
    const addWorkoutBtn = document.getElementById('add-workout-btn');
    let isBottomBarOpen = false;

    addWorkoutBtn.addEventListener('click', () => {
        const workoutSelectionOverlay = document.getElementById('workout-selection-overlay');
        workoutSelectionOverlay.classList.add('active');
    });

    // Close workout selection when clicking outside
    document.getElementById('workout-selection-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'workout-selection-overlay') {
            e.target.classList.remove('active');
        }
    });

    // Handle workout search
    const workoutSearch = document.getElementById('workout-search');
    workoutSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterWorkouts(searchTerm);
    });

    function filterWorkouts(searchTerm) {
        const workoutItems = document.querySelectorAll('.workout-item');
        
        workoutItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });

        // Show/hide categories based on whether they have visible items
        document.querySelectorAll('.workout-category').forEach(category => {
            const hasVisibleItems = Array.from(category.querySelectorAll('.workout-item'))
                .some(item => !item.classList.contains('hidden'));
            category.style.display = hasVisibleItems ? 'block' : 'none';
        });
    }

    // Workout data structure
    const workoutCategories = {
        'Chest Exercises': {
            color: 'brown',
            exercises: ['Standard Push-Ups', 'Wide Push-Ups', 'Diamond Push-Ups', 'Decline Push-Ups', 'Incline Push-Ups', 
                       'Archer Push-Ups', 'Clap Push-Ups', 'Plyo Push-Ups', 'Hindu Push-Ups', 'One-Arm Push-Ups', 
                       'Chest Dips', 'Slow Push-Ups', 'Explosive Push-Ups', 'Sphinx Push-Ups', 'Resistance Band Chest Press']
        },
        'Arm Exercises': {
            color: 'orange',
            exercises: ['Triceps Dips', 'Close-Grip Push-Ups', 'Isometric Arm Holds', 'Arm Circles', 'Towel Curls',
                       'Wall Push-Ups', 'Bodyweight Bicep Curl', 'Static Arm Squeeze', 'Negative Push-Ups', 'Towel Triceps Extensions']
        },
        'Shoulder Exercises': {
            color: 'yellow',
            exercises: ['Pike Push-Ups', 'Shoulder Taps', 'Elevated Pike Push-Ups', 'Wall Walks', 'Handstand Holds',
                       'Handstand Push-Ups', 'Arm Raises', 'Wall Angels', 'Reverse Plank Shoulder Taps', 'Scapular Push-Ups']
        },
        'Back Exercises': {
            color: 'green',
            exercises: ['Superman Hold', 'Superman Raises', 'Reverse Snow Angels', 'Prone Y-W-T Raises', 'Doorframe Rows',
                       'Towel Rows', 'Wall Pulls', 'Glute Bridges', 'Hip Thrusts', 'Table Rows']
        },
        'Abs Workouts': {
            color: 'blue',
            exercises: ['Crunches', 'Sit-Ups', 'Leg Raises', 'Flutter Kicks', 'Scissor Kicks', 'Bicycle Crunches',
                       'Russian Twists', 'V-Ups', 'Plank', 'Side Plank', 'Mountain Climbers', 'Plank Shoulder Taps',
                       'Plank to Push-Up', 'Hollow Body Hold', 'Heel Touches']
        },
        'Sit-Up Variations': {
            color: 'purple',
            exercises: ['Standard Sit-Ups', 'Decline Sit-Ups', 'Oblique Sit-Ups', 'Weighted Sit-Ups', 'Cross Sit-Ups',
                       'Butterfly Sit-Ups', 'Jackknife Sit-Ups', 'V-Sit Twists', 'Sit-Up to Stand', 'Sit-Up with Punches']
        },
        'Push-Up Variations': {
            color: 'black',
            exercises: ['Standard Push-Ups', 'Wide Push-Ups', 'Diamond Push-Ups', 'Spiderman Push-Ups', 'Staggered Push-Ups',
                       'T Push-Ups', 'Grasshopper Push-Ups', 'Cross-Body Push-Ups', 'Uneven Push-Ups', 'Push-Up to Pike']
        },
        'Lunge Variations': {
            color: 'red',
            exercises: ['Forward Lunges', 'Reverse Lunges', 'Walking Lunges', 'Jumping Lunges', 'Lateral Lunges',
                       'Curtsy Lunges', 'Bulgarian Split Squats', 'Step-Ups', 'Lunge Pulses', 'Wall-Supported Static Lunges']
        },
        'Full Body Workouts': {
            color: 'white',
            exercises: ['Burpees', 'High Knees', 'Jump Squats', 'Squat to Front Kick', 'Wall Sit',
                       'Bear Crawl', 'Crab Walk', 'Plank Jacks', 'Standing Long Jump', 'Skater Jumps']
        },
        'Leg Workouts': {
            color: 'brown',
            exercises: ['Squats', 'Narrow-Stance Squats', 'Sumo Squats', 'Jumping Squats', 'Pistol Squats',
                       'Assisted Pistol Squats', 'Wall Sits', 'Squat Pulses', 'Calf Raises', 'Single-Leg Calf Raises',
                       'Glute Bridge March', 'Glute Bridge with Leg Raise', 'Donkey Kicks', 'Fire Hydrants',
                       'Standing Hamstring Curls', 'Step-Back Lunges', 'Skater Lunges', 'Duck Walks', 'Frog Jumps', 'Wall Sit Calf Raises']
        },
        'Cardio & Athletic': {
            color: 'orange',
            exercises: ['Brisk Walking', 'Incline Walking', 'Power Walking', 'Jogging', 'Long-Distance Running',
                       'Sprint Intervals', '40-Meter Sprints', 'Hill Sprints', 'Stair Sprints', 'Backpedal Running',
                       'Side Shuffles', 'Zig-Zag Running', 'Bear Crawls', 'High Knee Sprints', 'Bounding Strides']
        },
        'Recovery Time': {
            color: 'blue',
            exercises: ['5 Minutes', '10 Minutes', '15 Minutes', '20 Minutes', '25 Minutes', '30 Minutes',
                       '45 Minutes', '1 Hour', '1.5 Hours', '2 Hours', '3 Hours', '4 Hours',
                       '5 Hours', '6 Hours', '24 Hours']
        }
    };

    // Add these handlers after the workoutCategories object definition
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-custom-link')) {
            const modal = document.getElementById('custom-workout-modal');
            modal.classList.add('active');
        }
    });

    const customWorkoutModal = document.getElementById('custom-workout-modal');
    const customWorkoutForm = document.getElementById('custom-workout-form');
    
    // Close modal on cancel or clicking outside
    document.querySelector('.cancel-btn').addEventListener('click', () => {
        customWorkoutModal.classList.remove('active');
    });
    
    customWorkoutModal.addEventListener('click', (e) => {
        if (e.target === customWorkoutModal) {
            customWorkoutModal.classList.remove('active');
        }
    });

    // Remove notifications from custom workout form submission
    customWorkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const workoutName = document.getElementById('custom-workout-name').value.trim();
        const workoutType = document.getElementById('custom-workout-type').value;
        
        // Add to workoutCategories
        if (!workoutCategories[workoutType].exercises.includes(workoutName)) {
            workoutCategories[workoutType].exercises.push(workoutName);
            
            // Save to localStorage
            const userId = auth.currentUser.uid;
            const customWorkouts = JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}');
            if (!customWorkouts[workoutType]) {
                customWorkouts[workoutType] = [];
            }
            customWorkouts[workoutType].push(workoutName);
            localStorage.setItem(`customWorkouts_${userId}`, JSON.stringify(customWorkouts));
            
            // Reset form and close modal
            customWorkoutForm.reset();
            customWorkoutModal.classList.remove('active');
            
            // Refresh workout list
            populateWorkoutList();
        }
    });

    // Modify populateWorkoutList function to include custom workouts
    function populateWorkoutList() {
        const workoutsList = document.getElementById('workouts-list');
        workoutsList.innerHTML = '';

        // Load custom workouts
        const userId = auth.currentUser?.uid;
        const customWorkouts = userId ? 
            JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}') : {};
        const userWorkouts = userId ? 
            JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]') : [];

        // Create a set of existing workout names for quick lookup
        const existingWorkouts = new Set(userWorkouts.map(w => w.name));

        Object.entries(workoutCategories).forEach(([category, data], index) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'workout-category';
            categoryDiv.style.animationDelay = `${index * 0.1}s`;

            // Combine built-in and custom exercises
            const allExercises = [...data.exercises];
            if (customWorkouts[category]) {
                allExercises.push(...customWorkouts[category]);
            }

            categoryDiv.innerHTML = `
                <h3 class="category-title ${data.color}">${category}</h3>
                <div class="workout-items">
                    ${allExercises.map((exercise, i) => `
                        <div class="workout-item ${existingWorkouts.has(exercise) ? 'disabled' : ''}" 
                             data-category="${category}" 
                             style="animation-delay: ${i * 0.05}s">
                            <span>${exercise}</span>
                            ${customWorkouts[category]?.includes(exercise) ? `
                                <button class="delete-custom-workout" title="Delete custom workout">
                                    <img src="images/trash.png" alt="Delete">
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;

            workoutsList.appendChild(categoryDiv);
        });

        // Add click handlers for workout items
        document.querySelectorAll('.workout-item').forEach(item => {
            if (!item.classList.contains('disabled')) {
                item.addEventListener('click', () => {
                    const workout = item.querySelector('span').textContent.trim();
                    const category = item.dataset.category;
                    if (saveUserWorkout(workout, category)) {
                        item.classList.add('disabled');
                    }
                });
            }
        });

        // Add delete handlers for custom workouts
        document.querySelectorAll('.delete-custom-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent workout selection
                const workoutItem = e.target.closest('.workout-item');
                const workout = workoutItem.querySelector('span').textContent.trim();
                const category = workoutItem.dataset.category;
                
                // Remove from customWorkouts
                const customWorkouts = JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}');
                if (customWorkouts[category]) {
                    customWorkouts[category] = customWorkouts[category].filter(w => w !== workout);
                    localStorage.setItem(`customWorkouts_${userId}`, JSON.stringify(customWorkouts));
                }
                
                // Animate removal
                workoutItem.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    populateWorkoutList(); // Refresh the list
                }, 300);
            });
        });
    }

    // Add these styles for the slideOut animation
    const slideOutStyle = document.createElement('style');
    slideOutStyle.textContent = `
        @keyframes slideOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(slideOutStyle);

    // Initialize workout list when opening the popup
    document.getElementById('add-workout-btn').addEventListener('click', () => {
        const workoutSelectionOverlay = document.getElementById('workout-selection-overlay');
        workoutSelectionOverlay.classList.add('active');
        populateWorkoutList(); // Add this line to populate the list
    });

    // Load existing workouts when page loads
    auth.onAuthStateChanged((user) => {
        if (user) {
            updateWorkoutsList();
        }
    });

    // Add click handler for custom workout link
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-custom-link')) {
            const modal = document.getElementById('custom-workout-modal');
            modal.classList.add('active');
        }
    });

    // Remove click handler for custom workout link since we're now opening modal directly
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-custom-link')) {
            const modal = document.getElementById('custom-workout-modal');
            modal.classList.add('active');
        }
    });

    // Modify saveUserWorkout to not affect the workout list appearance
    function saveUserWorkout(workout, category) {
        const userId = auth.currentUser.uid;
        let userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
        
        if (userWorkouts.some(w => w.name === workout)) {
            return false;
        }
        
        userWorkouts.push({
            name: workout,
            type: category,
            id: Date.now()
        });
        
        localStorage.setItem(`workouts_${userId}`, JSON.stringify(userWorkouts));
        updateWorkoutsList();
        return true;
    }

    // Modify custom workout form submission
    customWorkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const workoutName = document.getElementById('custom-workout-name').value.trim();
        const workoutType = document.getElementById('custom-workout-type').value;
        
        const userId = auth.currentUser.uid;
        const customWorkouts = JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}');
        
        // Initialize category array if it doesn't exist
        if (!customWorkouts[workoutType]) {
            customWorkouts[workoutType] = [];
        }
        
        // Check if workout already exists in category
        if (!customWorkouts[workoutType].includes(workoutName)) {
            customWorkouts[workoutType].push(workoutName);
            localStorage.setItem(`customWorkouts_${userId}`, JSON.stringify(customWorkouts));
            
            customWorkoutForm.reset();
            customWorkoutModal.classList.remove('active');
            
            // Add a slight delay before refreshing the page
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    });

    // Modify populateWorkoutList to properly handle custom workouts
    function populateWorkoutList() {
        const workoutsList = document.getElementById('workouts-list');
        workoutsList.innerHTML = '';

        const userId = auth.currentUser?.uid;
        const customWorkouts = userId ? 
            JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}') : {};
        const userWorkouts = userId ? 
            JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]') : [];

        const existingWorkouts = new Set(userWorkouts.map(w => w.name));

        Object.entries(workoutCategories).forEach(([category, data], index) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'workout-category';
            categoryDiv.style.animationDelay = `${index * 0.1}s`;

            // Get custom workouts for this category
            const customWorkoutsInCategory = customWorkouts[category] || [];
            const allExercises = [...data.exercises, ...customWorkoutsInCategory];

            categoryDiv.innerHTML = `
                <h3 class="category-title ${data.color}">${category}</h3>
                <div class="workout-items">
                    ${allExercises.map((exercise, i) => `
                        <div class="workout-item ${existingWorkouts.has(exercise) ? 'disabled' : ''}" 
                             data-category="${category}" 
                             style="animation-delay: ${i * 0.05}s">
                            <span>${exercise}</span>
                            ${customWorkoutsInCategory.includes(exercise) ? `
                                <button class="delete-custom-workout" title="Delete custom workout">
                                    <img src="images/trash.png" alt="Delete">
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;

            workoutsList.appendChild(categoryDiv);
        });

        // Add click handlers
        addWorkoutItemHandlers();
        addDeleteCustomWorkoutHandlers();
    }

    // Separate function for workout item click handlers
    function addWorkoutItemHandlers() {
        document.querySelectorAll('.workout-item').forEach(item => {
            if (!item.classList.contains('disabled')) {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.delete-custom-workout')) {
                        const workout = item.querySelector('span').textContent.trim();
                        const category = item.dataset.category;
                        if (saveUserWorkout(workout, category)) {
                            item.classList.add('disabled');
                        }
                    }
                });
            }
        });
    }

    // Separate function for delete custom workout handlers
    function addDeleteCustomWorkoutHandlers() {
        document.querySelectorAll('.delete-custom-workout').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const workoutItem = e.target.closest('.workout-item');
                const workout = workoutItem.querySelector('span').textContent.trim();
                const category = workoutItem.dataset.category;
                
                const userId = auth.currentUser.uid;
                const customWorkouts = JSON.parse(localStorage.getItem(`customWorkouts_${userId}`) || '{}');
                
                if (customWorkouts[category]) {
                    customWorkouts[category] = customWorkouts[category].filter(w => w !== workout);
                    if (customWorkouts[category].length === 0) {
                        delete customWorkouts[category];
                    }
                    localStorage.setItem(`customWorkouts_${userId}`, JSON.stringify(customWorkouts));
                }
                
                // Animate removal and refresh main list
                workoutItem.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    populateWorkoutList();
                    window.location.reload(); // Add this line to refresh the page
                }, 300);
            });
        });
    }

    // Calendar functionality
    const scheduleBtn = document.getElementById('add-schedule-btn');
    const scheduleOverlay = document.getElementById('schedule-selection-overlay');
    const calendarContainer = document.querySelector('.calendar-container');
    const weekdaysContainer = document.querySelector('.calendar-weekdays');
    const daysContainer = document.querySelector('.calendar-days');
    const currentMonthElement = document.querySelector('.current-month');
    const prevMonthBtn = document.querySelector('.prev-month');
    const nextMonthBtn = document.querySelector('.next-month');

    let currentDate = new Date();
    let selectedDate = null;

    // Initialize weekday headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdaysContainer.innerHTML = weekdays.map(day => 
        `<div class="weekday">${day}</div>`
    ).join('');

    // Update calendar variables
    let startDate = null;
    let endDate = null;
    const MIN_DAYS = 30;

    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        currentMonthElement.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let daysHTML = '';
        
        for (let i = 0; i < firstDay; i++) {
            daysHTML += '<div class="calendar-day disabled"></div>';
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isDisabled = date < today;
            const isRangeStart = startDate && date.getTime() === startDate.getTime();
            const isRangeEnd = endDate && date.getTime() === endDate.getTime();
            const isInRange = startDate && endDate && 
                             date > startDate && date < endDate;
            
            daysHTML += `
                <div class="calendar-day ${isDisabled ? 'disabled' : ''} 
                                        ${isRangeStart ? 'range-start' : ''} 
                                        ${isRangeEnd ? 'range-end' : ''} 
                                        ${isInRange ? 'in-range' : ''}"
                     data-date="${date.toISOString()}">
                    ${day}
                </div>
            `;
        }
        
        daysContainer.innerHTML = daysHTML;

        // Add click handlers to days
        document.querySelectorAll('.calendar-day:not(.disabled)').forEach(day => {
            day.addEventListener('click', () => handleDateSelection(new Date(day.dataset.date)));
        });

        updateDateRangeInfo();
    }

    function handleDateSelection(date) {
        if (!startDate || (startDate && endDate) || date < startDate) {
            // Start new selection
            startDate = date;
            endDate = null;
            document.querySelector('.date-range-error')?.classList.remove('show');
        } else {
            // Complete selection
            const daysDiff = Math.ceil((date - startDate) / (1000 * 60 * 60 * 24));
            if (daysDiff < MIN_DAYS) {
                const errorElement = document.querySelector('.date-range-error');
                errorElement.textContent = `Please select a period of at least ${MIN_DAYS} days`;
                errorElement.classList.add('show');
                return;
            }
            endDate = date;
        }
        updateCalendar();
    }

    function updateDateRangeInfo() {
        const infoElement = document.querySelector('.date-range-info');
        if (!infoElement) return;

        if (startDate && endDate) {
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            infoElement.textContent = `Selected period: ${daysDiff} days`;
            infoElement.classList.add('show');
        } else if (startDate) {
            infoElement.textContent = 'Select end date';
            infoElement.classList.add('show');
        } else {
            infoElement.textContent = 'Select start date';
            infoElement.classList.add('show');
        }
    }

    // Update confirm handler
    document.querySelector('.calendar-confirm').addEventListener('click', () => {
        if (!startDate || !endDate) {
            const errorElement = document.querySelector('.date-range-error');
            errorElement.textContent = 'Please select both start and end dates';
            errorElement.classList.add('show');
            return;
        }

        // Save the schedule period
        saveSchedulePeriod(startDate, endDate);

        scheduleOverlay.classList.remove('active');
        showNotification('Schedule period added successfully!', 'success');
        
        // Reset selection
        startDate = null;
        endDate = null;
    });

    // Update schedule button handler
    scheduleBtn.addEventListener('click', () => {
        startDate = null;
        endDate = null;
        currentDate = new Date();
        updateCalendar();
        scheduleOverlay.classList.add('active');
    });

    // Navigation handlers
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // Schedule button handler
    scheduleBtn.addEventListener('click', () => {
        selectedDate = null;
        currentDate = new Date();
        updateCalendar();
        scheduleOverlay.classList.add('active');
    });

    // Close handlers
    document.querySelector('.calendar-cancel').addEventListener('click', () => {
        scheduleOverlay.classList.remove('active');
    });

    scheduleOverlay.addEventListener('click', (e) => {
        if (e.target === scheduleOverlay) {
            scheduleOverlay.classList.remove('active');
        }
    });

    // Confirm handler
    document.querySelector('.calendar-confirm').addEventListener('click', () => {
        const timeInput = document.getElementById('schedule-time');
        if (!selectedDate || !timeInput.value) {
            return;
        }

        // Here you would handle the selected date and time
        const scheduledDateTime = new Date(selectedDate);
        const [hours, minutes] = timeInput.value.split(':');
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

        // You can save this to your storage/database
        console.log('Scheduled for:', scheduledDateTime);

        scheduleOverlay.classList.remove('active');
        showNotification('Schedule added successfully!', 'success');
    });

    // Initialize calendar
    updateCalendar();

    // Add this function near other data storage functions
    function saveSchedulePeriod(startDate, endDate) {
        const userId = auth.currentUser.uid;
        const scheduleData = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            createdAt: new Date().toISOString(),
            id: Date.now() // Add unique ID for deletion
        };

        // Replace any existing schedule instead of pushing
        localStorage.setItem(`schedules_${userId}`, JSON.stringify([scheduleData]));
    }

    function deleteSchedule(scheduleId) {
        const userId = auth.currentUser.uid;
        localStorage.setItem(`schedules_${userId}`, '[]');
        updateScheduleDisplay();
    }

    function updateScheduleDisplay() {
        const userId = auth.currentUser.uid;
        const schedules = JSON.parse(localStorage.getItem(`schedules_${userId}`) || '[]');
        const weeksContainer = document.querySelector('.weeks-container');
        const daysContainer = document.querySelector('.days-container');

        weeksContainer.innerHTML = '';
        daysContainer.innerHTML = '';

        // Only display if there's a schedule
        if (schedules.length > 0) {
            const schedule = schedules[0]; // Get the only schedule
            const startDate = new Date(schedule.startDate);
            const endDate = new Date(schedule.endDate);
            const weekNumber = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000));
            
            // Add week entry with delete button (unchanged)
            const weekEntry = document.createElement('div');
            weekEntry.className = 'week-entry';
            
            weekEntry.innerHTML = `
                <div class="week-header">
                    <div class="week-title">Week ${weekNumber} Schedule</div>
                    <div class="week-info">
                        <div class="week-dates">
                            ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
                        </div>
                        <button class="delete-schedule" data-id="${schedule.id}">
                            <img src="images/trash.png" alt="Delete">
                        </button>
                    </div>
                </div>
            `;
            weeksContainer.appendChild(weekEntry);

            // Get current date for comparison
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);

            let iterDate = new Date(startDate);
            while (iterDate <= endDate) {
                const dayEntry = document.createElement('div');
                dayEntry.className = 'day-entry';
                
                // Check if this is the current day
                const isCurrentDay = iterDate.getTime() === currentDate.getTime();
                if (isCurrentDay) {
                    dayEntry.classList.add('current-day');
                }
                
                const dayId = `day_${iterDate.toISOString().split('T')[0]}`;
                dayEntry.innerHTML = `
                    <div class="day-main-content">
                        <div class="day-date">
                            ${iterDate.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'short', 
                                day: 'numeric' 
                            })}
                        </div>
                        <div class="day-actions">
                            <div class="day-status">Scheduled</div>
                            <button class="day-add-workout" data-day="${dayId}" title="Add workout"></button>
                        </div>
                    </div>
                    <div class="day-workouts" id="${dayId}"></div>
                `;
                daysContainer.appendChild(dayEntry);

                // Load and display existing workouts for this day
                const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                const workoutsContainer = dayEntry.querySelector('.day-workouts');
                
                dayWorkouts.forEach(workout => {
                    createWorkoutTag(workout, workoutsContainer, dayId);
                });

                // Add handler for the add workout button
                const addButton = dayEntry.querySelector('.day-add-workout');
                addButton.addEventListener('click', () => {
                    const userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
                    if (userWorkouts.length === 0) {
                        showNotification('Add some workouts first in the Workouts section!', 'error');
                        return;
                    }

                    // Create and show workout selection dialog
                    const dialog = document.createElement('div');
                    dialog.className = 'workout-selection-overlay active';
                    dialog.innerHTML = `
                        <div class="workout-selection-container" style="opacity: 1; transform: translateY(0);">
                            <h2>Select Workout for ${iterDate.toLocaleDateString()}</h2>
                            <div class="workouts-list">
                                ${userWorkouts.map(workout => `
                                    <div class="workout-item" data-workout='${JSON.stringify(workout)}'>
                                        <span>${workout.name}</span>
                                        <small>(${workout.type})</small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;

                    document.body.appendChild(dialog);

                    // Handle workout selection
                    dialog.querySelectorAll('.workout-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const workout = JSON.parse(item.dataset.workout);
                            const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                            
                            if (!dayWorkouts.some(w => w.id === workout.id)) {
                                dayWorkouts.push(workout);
                                localStorage.setItem(`dayWorkouts_${userId}_${dayId}`, JSON.stringify(dayWorkouts));
                                
                                createWorkoutTag(workout, workoutsContainer, dayId);
                            }
                            
                            dialog.remove();
                        });
                    });

                    // Close dialog when clicking outside
                    dialog.addEventListener('click', (e) => {
                        if (e.target === dialog) {
                            dialog.remove();
                        }
                    });
                });
                
                iterDate.setDate(iterDate.getDate() + 1);
            }

            // Add delete handler
            const deleteBtn = weekEntry.querySelector('.delete-schedule');
            deleteBtn.addEventListener('click', () => {
                weekEntry.style.animation = 'slideOutRight 0.3s ease-out forwards';
                setTimeout(() => {
                    deleteSchedule(schedule.id);
                }, 300);
            });
        }
    }

    // Replace the calendar confirm handler
    document.querySelector('.calendar-confirm').addEventListener('click', () => {
        if (!startDate || !endDate) {
            const errorElement = document.querySelector('.date-range-error');
            errorElement.textContent = 'Please select both start and end dates';
            errorElement.classList.add('show');
            return;
        }

        // Save the schedule period
        saveSchedulePeriod(startDate, endDate);
        updateScheduleDisplay(); // Add this line

        scheduleOverlay.classList.remove('active');
        showNotification('Schedule period added successfully!', 'success');
        
        // Reset selection
        startDate = null;
        endDate = null;
    });

    // Remove or comment out this section since we don't need time selection anymore
    // document.querySelector('.calendar-confirm').addEventListener('click', () => {
    //     const timeInput = document.getElementById('schedule-time');
    //     if (!selectedDate || !timeInput.value) {
    //         showNotification('Please select both date and time', 'error');
    //         return;
    //     }
    //     ...
    // });

});

function updateInfoCards() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const isQuestionnaireDone = localStorage.getItem(`questionnaire_completed_${userId}`) === 'true';
    const selectionArea = document.getElementById('selection-area');
    const infoCardsContainer = document.querySelector('.info-cards-container');

    // Show/hide the entire selection area based on questionnaire completion
    if (!isQuestionnaireDone) {
        selectionArea.classList.add('hide-selection');
        return;
    } else {
        selectionArea.classList.remove('hide-selection');
        infoCardsContainer.style.display = 'grid'; // Force grid display when questionnaire is done
        infoCardsContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
        infoCardsContainer.style.gap = '2rem';
        infoCardsContainer.style.padding = '1rem';
    }

    // Update card contents
    const physiqueData = JSON.parse(localStorage.getItem(`physique_${userId}`) || '{}');
    const nameData = JSON.parse(localStorage.getItem(`name_${userId}`) || '{}');
    const birthData = JSON.parse(localStorage.getItem(`birth_${userId}`) || '{}');
    const avatarData = JSON.parse(localStorage.getItem(`avatar_${userId}`) || '{}');
    const accountData = JSON.parse(localStorage.getItem(`account_${userId}`) || '{}');

    // Update physique card
    const physiqueCard = document.querySelector('.physique-card');
    if (physiqueCard) {
        physiqueCard.querySelector('.height span').textContent = physiqueData.height ? `${physiqueData.height} cm` : '--';
        physiqueCard.querySelector('.weight span').textContent = physiqueData.weight ? `${physiqueData.weight} kg` : '--';
        physiqueCard.querySelector('.metabolic span').textContent = physiqueData.metabolicRate ? `${physiqueData.metabolicRate} kcal` : '--';
    }

    // Update personal card
    const personalCard = document.querySelector('.personal-card');
    if (personalCard) {
        personalCard.querySelector('.firstname span').textContent = nameData.firstName || '--';
        personalCard.querySelector('.secondname span').textContent = nameData.secondName || '--';
        personalCard.querySelector('.lastname span').textContent = nameData.lastName || '--';
    }

    // Update birth card
    const birthCard = document.querySelector('.birth-card');
    if (birthCard) {
        birthCard.querySelector('.year span').textContent = birthData.year || '--';
        birthCard.querySelector('.month span').textContent = birthData.month ? getMonthName(birthData.month) : '--';
        birthCard.querySelector('.day span').textContent = birthData.day || '--';
    }

    // Update avatar card
    const avatarCard = document.querySelector('.avatar-card');
    if (avatarCard) {
        const avatarImg = avatarCard.querySelector('.avatar-preview img');
        if (avatarData.profilePicture) {
            avatarImg.src = avatarData.profilePicture;
        }
        avatarCard.querySelector('.nickname span').textContent = avatarData.nickname || '--';
        avatarCard.querySelector('.gender span').textContent = avatarData.gender || '--';
    }

    // Update account card
    const accountCard = document.querySelector('.account-info-card');
    if (accountCard) {
        accountCard.querySelector('.email span').textContent = accountData.email || '--';
        const passwordText = accountCard.querySelector('.password-text');
        if (accountData.password) {
            passwordText.textContent = '••••••••';
            passwordText.dataset.password = accountData.password;
        } else {
            passwordText.textContent = '--';
        }
    }
}

function getMonthName(monthNumber) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNumber - 1] || '--';
}

function updateScheduleDisplay() {
    const userId = auth.currentUser.uid;
    const schedules = JSON.parse(localStorage.getItem(`schedules_${userId}`) || '[]');
    const weeksContainer = document.querySelector('.weeks-container');
    const daysContainer = document.querySelector('.days-container');

    weeksContainer.innerHTML = '';
    daysContainer.innerHTML = '';

    // Only display if there's a schedule
    if (schedules.length > 0) {
        const schedule = schedules[0]; // Get the only schedule
        const startDate = new Date(schedule.startDate);
        const endDate = new Date(schedule.endDate);
        const weekNumber = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000));
        
        // Add week entry with delete button (unchanged)
        const weekEntry = document.createElement('div');
        weekEntry.className = 'week-entry';
        
        weekEntry.innerHTML = `
            <div class="week-header">
                <div class="week-title">Week ${weekNumber} Schedule</div>
                <div class="week-info">
                    <div class="week-dates">
                        ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
                    </div>
                    <button class="delete-schedule" data-id="${schedule.id}">
                        <img src="images/trash.png" alt="Delete">
                    </button>
                </div>
            </div>
        `;
        weeksContainer.appendChild(weekEntry);

        // Get current date for comparison
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        let iterDate = new Date(startDate);
        while (iterDate <= endDate) {
            const dayEntry = document.createElement('div');
            dayEntry.className = 'day-entry';
            
            // Check if this is the current day
            const isCurrentDay = iterDate.getTime() === currentDate.getTime();
            if (isCurrentDay) {
                dayEntry.classList.add('current-day');
            }
            
            const dayId = `day_${iterDate.toISOString().split('T')[0]}`;
            dayEntry.innerHTML = `
                <div class="day-main-content">
                    <div class="day-date">
                        ${iterDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'short', 
                            day: 'numeric' 
                        })}
                    </div>
                    <div class="day-actions">
                        <div class="day-status">Scheduled</div>
                        <button class="day-add-workout" data-day="${dayId}" title="Add workout"></button>
                    </div>
                </div>
                <div class="day-workouts" id="${dayId}"></div>
            `;
            daysContainer.appendChild(dayEntry);

            // Load and display existing workouts for this day
            const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
            const workoutsContainer = dayEntry.querySelector('.day-workouts');
            
            dayWorkouts.forEach(workout => {
                createWorkoutTag(workout, workoutsContainer, dayId);
            });

            // Add handler for the add workout button
            const addButton = dayEntry.querySelector('.day-add-workout');
            addButton.addEventListener('click', () => {
                const userWorkouts = JSON.parse(localStorage.getItem(`workouts_${userId}`) || '[]');
                if (userWorkouts.length === 0) {
                    showNotification('Add some workouts first in the Workouts section!', 'error');
                    return;
                }

                // Create and show workout selection dialog
                const dialog = document.createElement('div');
                dialog.className = 'workout-selection-overlay active';
                dialog.innerHTML = `
                    <div class="workout-selection-container" style="opacity: 1; transform: translateY(0);">
                        <h2>Select Workout for ${iterDate.toLocaleDateString()}</h2>
                        <div class="workouts-list">
                            ${userWorkouts.map(workout => `
                                <div class="workout-item" data-workout='${JSON.stringify(workout)}'>
                                    <span>${workout.name}</span>
                                    <small>(${workout.type})</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;

                document.body.appendChild(dialog);

                // Handle workout selection
                dialog.querySelectorAll('.workout-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const workout = JSON.parse(item.dataset.workout);
                        const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
                        
                        if (!dayWorkouts.some(w => w.id === workout.id)) {
                            dayWorkouts.push(workout);
                            localStorage.setItem(`dayWorkouts_${userId}_${dayId}`, JSON.stringify(dayWorkouts));
                            
                            createWorkoutTag(workout, workoutsContainer, dayId);
                        }
                        
                        dialog.remove();
                    });
                });

                // Close dialog when clicking outside
                dialog.addEventListener('click', (e) => {
                    if (e.target === dialog) {
                        dialog.remove();
                    }
                });
            });
            
            iterDate.setDate(iterDate.getDate() + 1);
        }

        // Add delete handler
        const deleteBtn = weekEntry.querySelector('.delete-schedule');
        deleteBtn.addEventListener('click', () => {
            weekEntry.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => {
                deleteSchedule(schedule.id);
            }, 300);
        });
    }
}

// Update the calendar confirm handler to refresh the schedule display
document.querySelector('.calendar-confirm').addEventListener('click', () => {
    if (!startDate || !endDate) {
        const errorElement = document.querySelector('.date-range-error');
        errorElement.textContent = 'Please select both start and end dates';
        errorElement.classList.add('show');
        return;
    }

    saveSchedulePeriod(startDate, endDate);
    updateScheduleDisplay(); // Add this line

    scheduleOverlay.classList.remove('active');
    showNotification('Schedule period added successfully!', 'success');
    
    startDate = null;
    endDate = null;
});

// Call updateScheduleDisplay when switching to schedule section
function switchSection(sectionId) {
    // Hide all sections first
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Show the selected section
    const targetSection = document.querySelector(`.section-content[data-section="${sectionId}"]`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update button states
    sidebarButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionId) {
            btn.classList.add('active');
        }
    });

    // Close sidebar and overlay
    sidebar.classList.remove('active');
    overlay.classList.remove('active');

    if (sectionId === 'schedule') {
        updateScheduleDisplay();
    }
}

function createWorkoutTag(workout, workoutsContainer, dayId) {
    const userId = auth.currentUser.uid;
    const workoutTag = document.createElement('div');
    workoutTag.className = 'day-workout-tag';
    
    // Get existing stats if any
    const workoutStats = JSON.parse(localStorage.getItem(`workoutStats_${userId}_${dayId}_${workout.id}`) || 'null');
    
    workoutTag.innerHTML = `
        <div class="day-workout-content">
            ${workout.name}
            ${workoutStats ? 
                `<span class="workout-stats">${
                    workoutStats.type === 'distance' ? 
                    `${workoutStats.value}km` : 
                    `x${workoutStats.value}`
                }</span>` : 
                ''
            }
        </div>
        <div class="workout-actions">
            <button class="add-stats-btn" title="Add stats"></button>
            <button class="delete-day-workout" data-workout-id="${workout.id}" title="Remove workout">
                <img src="images/trash.png" alt="Delete">
            </button>
        </div>
    `;
    
    // Add stats button handler
    const addStatsBtn = workoutTag.querySelector('.add-stats-btn');
    addStatsBtn.addEventListener('click', () => {
        showStatsModal(workout, dayId, workoutTag);
    });

    // Add delete handler
    const deleteBtn = workoutTag.querySelector('.delete-day-workout');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const workoutId = parseInt(e.currentTarget.dataset.workoutId);
        const dayWorkouts = JSON.parse(localStorage.getItem(`dayWorkouts_${userId}_${dayId}`) || '[]');
        const updatedWorkouts = dayWorkouts.filter(w => w.id !== workoutId);
        localStorage.setItem(`dayWorkouts_${userId}_${dayId}`, JSON.stringify(updatedWorkouts));
        
        // Also remove stats when workout is deleted
        localStorage.removeItem(`workoutStats_${userId}_${dayId}_${workoutId}`);
        
        workoutTag.style.opacity = '0';
        workoutTag.style.transform = 'scale(0.8)';
        setTimeout(() => workoutTag.remove(), 300);
    });

    workoutsContainer.appendChild(workoutTag);
    return workoutTag;
}

function showStatsModal(workout, dayId, workoutTag) {
    const userId = auth.currentUser.uid;
    const modal = document.createElement('div');
    modal.className = 'stats-modal';
    
    // Get existing stats if any
    const existingStats = JSON.parse(localStorage.getItem(`workoutStats_${userId}_${dayId}_${workout.id}`) || 'null');
    
    modal.innerHTML = `
        <div class="stats-container">
            <h3 style="margin-top: 0; margin-bottom: 20px;">Add Stats for ${workout.name}</h3>
            <div class="stats-options">
                <div class="stats-option ${existingStats?.type === 'distance' ? 'selected' : ''}" data-type="distance">Distance (km)</div>
                <div class="stats-option ${existingStats?.type === 'reps' ? 'selected' : ''}" data-type="reps">Reps</div>
            </div>
            <input type="number" class="stats-input" placeholder="Enter value" value="${existingStats?.value || ''}" min="0" step="0.1">
            <div class="stats-actions">
                <button class="calendar-cancel">Cancel</button>
                <button class="calendar-confirm">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 0);

    // Option selection
    const options = modal.querySelectorAll('.stats-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    // Confirm handler
    modal.querySelector('.calendar-confirm').addEventListener('click', () => {
        const selectedOption = modal.querySelector('.stats-option.selected');
        const value = modal.querySelector('.stats-input').value;
        
        if (!selectedOption || !value) {
            showNotification('Please select a type and enter a value', 'error');
            return;
        }

        const stats = {
            type: selectedOption.dataset.type,
            value: parseFloat(value)
        };

        // Save stats
        localStorage.setItem(`workoutStats_${userId}_${dayId}_${workout.id}`, JSON.stringify(stats));
        
        // Update workout tag display
        const workoutContent = workoutTag.querySelector('.day-workout-content');
        let statsSpan = workoutContent.querySelector('.workout-stats');
        if (!statsSpan) {
            statsSpan = document.createElement('span');
            statsSpan.className = 'workout-stats';
            workoutContent.appendChild(statsSpan);
        }
        statsSpan.textContent = stats.type === 'distance' ? `${stats.value}km` : `x${stats.value}`;

        // Close modal
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    });

    // Cancel handler
    modal.querySelector('.calendar-cancel').addEventListener('click', () => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    });
}
