// DeployHub Demo - Interactive JavaScript

// DOM Elements
const modal = document.getElementById('deployment-modal');
const s3Status = document.getElementById('s3-status');
const cfStatus = document.getElementById('cf-status');
const sslStatus = document.getElementById('ssl-status');
const dnsStatus = document.getElementById('dns-status');
const loadTime = document.getElementById('load-time');
const uptime = document.getElementById('uptime');
const locations = document.getElementById('locations');

// Initialize the demo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DeployHub Demo Loaded Successfully!');
    
    // Add scroll animations
    addScrollAnimations();
    
    // Initialize performance metrics
    initializeMetrics();
    
    // Add smooth scrolling for navigation links
    addSmoothScrolling();
    
    // Add loading animation
    simulateLoading();
});

// Modal Functions
function showDeploymentInfo() {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Add entrance animation
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.opacity = '0';
    modalContent.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        modalContent.style.transition = 'all 0.3s ease';
        modalContent.style.opacity = '1';
        modalContent.style.transform = 'scale(1)';
    }, 10);
}

function closeModal() {
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.transition = 'all 0.3s ease';
    modalContent.style.opacity = '0';
    modalContent.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 300);
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === modal) {
        closeModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && modal.style.display === 'block') {
        closeModal();
    }
});

// Animate Elements Function
function animateElements() {
    // Animate feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.animation = 'none';
            card.offsetHeight; // Trigger reflow
            card.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s`;
        }, index * 100);
    });
    
    // Animate floating card
    const floatingCard = document.querySelector('.floating-card');
    floatingCard.style.animation = 'none';
    floatingCard.offsetHeight;
    floatingCard.style.animation = 'float 6s ease-in-out infinite';
    
    // Show success message
    showNotification('✨ Elements animated successfully!', 'success');
}

// Simulate Deployment Function
function simulateDeployment() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    // Disable button and show loading
    button.disabled = true;
    button.innerHTML = '🔄 Deploying...';
    
    // Simulate deployment steps
    const steps = [
        { status: '🚀 Initiating deployment...', delay: 1000 },
        { status: '☁️ Creating S3 bucket...', delay: 2000 },
        { status: '🌐 Setting up CloudFront...', delay: 3000 },
        { status: '🔒 Provisioning SSL...', delay: 4000 },
        { status: '✅ Deployment complete!', delay: 5000 }
    ];
    
    let currentStep = 0;
    
    function updateStep() {
        if (currentStep < steps.length) {
            button.innerHTML = steps[currentStep].status;
            currentStep++;
            
            if (currentStep < steps.length) {
                setTimeout(updateStep, steps[currentStep].delay);
            } else {
                // Reset button after completion
                setTimeout(() => {
                    button.disabled = false;
                    button.innerHTML = originalText;
                    showNotification('🚀 New deployment simulated successfully!', 'success');
                }, 1000);
            }
        }
    }
    
    updateStep();
}

// Add Scroll Animations
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .demo-card, .about-content');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease-out';
        observer.observe(el);
    });
}

// Initialize Performance Metrics
function initializeMetrics() {
    // Simulate real-time metrics updates
    setInterval(() => {
        // Simulate load time variations
        const baseLoadTime = 0.8;
        const variation = (Math.random() - 0.5) * 0.2;
        loadTime.textContent = (baseLoadTime + variation).toFixed(1) + 's';
        
        // Simulate uptime with small variations
        const baseUptime = 99.9;
        const uptimeVariation = (Math.random() - 0.5) * 0.1;
        uptime.textContent = (baseUptime + uptimeVariation).toFixed(1) + '%';
        
        // Edge locations (static for demo)
        locations.textContent = '200+';
    }, 5000);
}

// Add Smooth Scrolling
function addSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Simulate Loading Animation
function simulateLoading() {
    // Add loading animation to status items
    const statusItems = document.querySelectorAll('.status-item');
    
    statusItems.forEach((item, index) => {
        setTimeout(() => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            item.style.transition = 'all 0.5s ease-out';
            
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, 100);
        }, index * 200);
    });
}

// Show Notification Function
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
    }
    
    .notification-message {
        font-weight: 500;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s ease;
    }
    
    .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }
`;
document.head.appendChild(notificationStyles);

// Performance Monitoring
window.addEventListener('load', function() {
    // Simulate performance metrics
    setTimeout(() => {
        showNotification('📊 Performance metrics loaded successfully!', 'success');
    }, 1000);
});

// Add some interactive hover effects
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add click effects to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
});

// Console welcome message
console.log(`
🚀 Welcome to DeployHub Demo!
📱 This is a demonstration website showcasing DeployHub's capabilities
☁️ It will be deployed to AWS using Terraform infrastructure
🔧 Feel free to explore the interactive features!
`);
