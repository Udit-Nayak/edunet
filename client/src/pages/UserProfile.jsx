import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { authAPI, postAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import PageShell from '../components/common/PageShell';
import PostCard from '../components/post/PostCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { FiCalendar, FiAward, FiTrendingUp, FiMapPin, FiGlobe, FiGithub, FiLinkedin, FiTwitter, FiExternalLink, FiEdit2 } from 'react-icons/fi';
import { format } from 'date-fns';
import { Avatar } from '../components/ui/Avatar';
import * as Tabs from '@radix-ui/react-tabs';

export default function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const isOwnProfile = currentUser?._id === userId;

  useEffect(() => {
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeTab]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user info by ID
      const userResponse = await authAPI.getUserById(userId);
      setUser(userResponse.data.user);

      // Fetch user's posts
      const params = {
        page: 1,
        limit: 20,
      };
      
      if (activeTab !== 'all') {
        params.type = activeTab;
      }

      const postsResponse = await postAPI.getUserPosts(userId, params);
      setPosts(postsResponse.data.posts);
      setError(null);
    } catch {
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePostDelete = (postId) => {
    setPosts(posts.filter(post => post._id !== postId));
  };

  const normalizeExternalUrl = (value) => {
    if (!value || typeof value !== 'string') return '#';

    const trimmed = value.trim();
    if (!trimmed) return '#';

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return `https://${trimmed}`;
  };

  if (loading) {
    return (
      <PageShell showRightSidebar={false}>
        <div className="w-full max-w-4xl mx-auto py-20 flex justify-center">
          <LoadingSpinner size="lg" text="Loading profile..." />
        </div>
      </PageShell>
    );
  }

  if (error || !user) {
    return (
      <PageShell showRightSidebar={false}>
        <div className="w-full max-w-4xl mx-auto py-20">
          <ErrorMessage message={error || 'User not found'} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showRightSidebar={false}>
      <div className="w-full max-w-4xl mx-auto pb-12">
        {/* Profile Header */}
        <div className="bg-bg-secondary rounded-xl shadow-card border border-border overflow-hidden mb-8">
          <div className="px-6 sm:px-8 pt-6 pb-8 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 md:mb-6 gap-4">
              <div className="p-1 bg-bg-secondary rounded-full inline-block">
                <Avatar
                  src={user.avatar}
                  alt={user.username}
                  size="xxl"
                  fallback={user.username.charAt(0)}
                  className="border-4 border-bg-secondary"
                />
              </div>

              {isOwnProfile && (
                <Link
                  to="/edit-profile"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-bg-primary border border-border text-text-primary font-semibold text-sm hover:bg-surface-hover transition-colors"
                >
                  <FiEdit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Link>
              )}
            </div>

            {/* User Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-text-primary">{user.username}</h1>
                <p className="text-[13px] font-bold text-text-tertiary uppercase tracking-wider mt-1">
                  Joined {format(new Date(user.createdAt), 'MMMM yyyy')}
                </p>
              </div>

              {user.headline && (
                <p className="text-[17px] text-text-primary font-medium">{user.headline}</p>
              )}

              {user.bio && (
                <p className="text-[15px] text-text-secondary leading-relaxed max-w-3xl">{user.bio}</p>
              )}

              {/* Location and Website */}
              <div className="flex flex-wrap gap-4 pt-2">
                {(user.location?.city || user.location?.state || user.location?.country) && (
                  <div className="flex items-center text-[13px] font-medium text-text-secondary bg-bg-primary border border-border px-3 py-1.5 rounded-lg">
                    <FiMapPin className="w-4 h-4 mr-1.5 opacity-70" />
                    <span>
                      {[user.location.city, user.location.state, user.location.country]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {user.website && (
                  <a
                    href={normalizeExternalUrl(user.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-[13px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20 px-3 py-1.5 rounded-lg"
                  >
                    <FiGlobe className="w-4 h-4 mr-1.5" />
                    <span>Website</span>
                  </a>
                )}
              </div>

              {/* Social Links */}
              {(user.socialLinks?.linkedin || user.socialLinks?.github || user.socialLinks?.twitter || user.socialLinks?.portfolio) && (
                <div className="flex gap-3 pt-2">
                  {user.socialLinks.linkedin && (
                    <a
                      href={normalizeExternalUrl(user.socialLinks.linkedin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-bg-primary border border-border text-text-secondary hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                      title="LinkedIn"
                    >
                      <FiLinkedin className="w-4 h-4" />
                    </a>
                  )}
                  {user.socialLinks.github && (
                    <a
                      href={normalizeExternalUrl(user.socialLinks.github)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-bg-primary border border-border text-text-secondary hover:text-gray-900 hover:border-gray-300 hover:bg-gray-100 transition-all"
                      title="GitHub"
                    >
                      <FiGithub className="w-4 h-4" />
                    </a>
                  )}
                  {user.socialLinks.twitter && (
                    <a
                      href={normalizeExternalUrl(user.socialLinks.twitter)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-bg-primary border border-border text-text-secondary hover:text-blue-400 hover:border-blue-200 hover:bg-blue-50 transition-all"
                      title="Twitter"
                    >
                      <FiTwitter className="w-4 h-4" />
                    </a>
                  )}
                  {user.socialLinks.portfolio && (
                    <a
                      href={normalizeExternalUrl(user.socialLinks.portfolio)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-bg-primary border border-border text-text-secondary hover:text-primary hover:border-primary/30 hover:bg-primary/10 transition-all"
                      title="Portfolio"
                    >
                      <FiExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border mt-6">
                {user.college && (
                  <div className="flex flex-col bg-bg-primary border border-border rounded-xl p-4">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Institution</span>
                    <span className="text-[15px] font-bold text-text-primary">{user.college}</span>
                  </div>
                )}
                
                {user.yearOfStudy && (
                  <div className="flex flex-col bg-bg-primary border border-border rounded-xl p-4">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">Academic Year</span>
                    <span className="text-[15px] font-bold text-text-primary">{user.yearOfStudy}</span>
                  </div>
                )}
              </div>

              {/* Interests */}
              {user.interests && user.interests.length > 0 && (
                <div className="pt-4">
                  <span className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-3">Interests</span>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[13px] font-bold"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-border mt-6">
                <div className="flex flex-col items-center justify-center p-4 bg-bg-primary rounded-xl border border-border">
                  <FiAward className="w-6 h-6 text-accent-orange mb-2" />
                  <p className="text-2xl font-bold font-mono text-text-primary">
                    {user.reputation || 0}
                  </p>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mt-1">Reputation</p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-bg-primary rounded-xl border border-border">
                  <FiTrendingUp className="w-6 h-6 text-accent-green mb-2" />
                  <p className="text-2xl font-bold font-mono text-text-primary">
                    {user.currentStreak || 0}
                  </p>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mt-1">Day Streak</p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-bg-primary rounded-xl border border-border">
                  <p className="text-2xl font-bold font-mono text-text-primary">
                    {user.followersCount || 0}
                  </p>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mt-1">Followers</p>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-bg-primary rounded-xl border border-border">
                  <p className="text-2xl font-bold font-mono text-text-primary">
                    {user.followingCount || 0}
                  </p>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mt-1">Following</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Education Section */}
            {user.education && user.education.length > 0 && (
              <div className="bg-bg-secondary rounded-xl shadow-card border border-border p-6">
                <h2 className="text-[16px] font-bold text-text-primary mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Education
                </h2>
                <div className="space-y-6">
                  {user.education.map((edu, index) => (
                    <div key={index} className="relative pl-4 border-l-2 border-border pb-1">
                      <div className="absolute w-2.5 h-2.5 rounded-full bg-border -left-[5px] top-1.5" />
                      <h3 className="font-bold text-[14px] text-text-primary leading-tight">
                        {edu.degree} {edu.fieldOfStudy && <span className="text-primary font-medium">in {edu.fieldOfStudy}</span>}
                      </h3>
                      <p className="text-[13px] font-medium text-text-secondary mt-1">{edu.institution}</p>
                      <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mt-2">
                        {edu.startDate} - {edu.currentlyStudying ? 'Present' : edu.endDate || 'N/A'}
                      </p>
                      {edu.grade && <p className="text-[13px] text-text-secondary mt-1">Grade: <span className="font-bold text-text-primary">{edu.grade}</span></p>}
                      {edu.description && <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">{edu.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience Section */}
            {user.experience && user.experience.length > 0 && (
              <div className="bg-bg-secondary rounded-xl shadow-card border border-border p-6">
                <h2 className="text-[16px] font-bold text-text-primary mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-green" />
                  Experience
                </h2>
                <div className="space-y-6">
                  {user.experience.map((exp, index) => (
                    <div key={index} className="relative pl-4 border-l-2 border-border pb-1">
                      <div className="absolute w-2.5 h-2.5 rounded-full bg-border -left-[5px] top-1.5" />
                      <h3 className="font-bold text-[14px] text-text-primary">{exp.title}</h3>
                      <p className="text-[13px] font-medium text-text-secondary mt-1">{exp.company}</p>
                      {exp.location && <p className="text-[12px] text-text-tertiary mt-1">{exp.location}</p>}
                      <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mt-2">
                        {exp.startDate} - {exp.currentlyWorking ? 'Present' : exp.endDate || 'N/A'}
                        {exp.employmentType && ` • ${exp.employmentType}`}
                      </p>
                      {exp.description && <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills Section */}
            {user.skills && user.skills.length > 0 && (
              <div className="bg-bg-secondary rounded-xl shadow-card border border-border p-6">
                <h2 className="text-[16px] font-bold text-text-primary mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-blue" />
                  Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {user.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-bg-primary border border-border text-text-secondary rounded-lg text-[13px] font-bold"
                    >
                      {skill.name} {skill.level && <span className="opacity-50 ml-1 font-normal">• {skill.level}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages Section */}
            {user.languages && user.languages.length > 0 && (
              <div className="bg-bg-secondary rounded-xl shadow-card border border-border p-6">
                <h2 className="text-[16px] font-bold text-text-primary mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-orange" />
                  Languages
                </h2>
                <div className="space-y-2">
                  {user.languages.map((lang, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-bg-primary border border-border rounded-lg">
                      <span className="font-bold text-[14px] text-text-primary">{lang.name}</span>
                      <span className="text-[12px] font-bold text-text-secondary uppercase tracking-wider bg-bg-secondary px-2 py-0.5 rounded-md border border-border">{lang.proficiency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications Section */}
            {user.certifications && user.certifications.length > 0 && (
              <div className="bg-bg-secondary rounded-xl shadow-card border border-border p-6">
                <h2 className="text-[16px] font-bold text-text-primary mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-purple" />
                  Certifications
                </h2>
                <div className="space-y-4">
                  {user.certifications.map((cert, index) => (
                    <div key={index} className="p-4 bg-bg-primary border border-border rounded-lg">
                      <h3 className="font-bold text-[14px] text-text-primary">{cert.name}</h3>
                      <p className="text-[13px] text-text-secondary mt-1">{cert.issuingOrganization}</p>
                      <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mt-2">
                        Issued {cert.issueDate}
                        {cert.expirationDate && ` • Expires ${cert.expirationDate}`}
                      </p>
                      {cert.credentialUrl && (
                        <a
                          href={normalizeExternalUrl(cert.credentialUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-[12px] font-bold text-primary mt-3 hover:underline"
                        >
                          View Credential <FiExternalLink className="ml-1 w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Projects & Contributions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Projects Section */}
            {user.projects && user.projects.length > 0 && (
              <div className="bg-bg-secondary rounded-xl shadow-card border border-border p-6">
                <h2 className="text-[18px] font-bold text-text-primary mb-4">Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.projects.map((project, index) => (
                    <div key={index} className="flex flex-col border border-border rounded-xl p-5 bg-bg-primary hover:border-primary/50 transition-colors">
                      <h3 className="font-bold text-[15px] text-text-primary mb-2 line-clamp-1">{project.title}</h3>
                      <p className="text-[13px] text-text-secondary mb-4 line-clamp-3 flex-1 leading-relaxed">{project.description}</p>
                      
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {project.technologies.slice(0, 4).map((tech, i) => (
                            <span key={i} className="px-2 py-0.5 bg-bg-secondary border border-border text-text-secondary rounded-md text-[11px] font-bold">
                              {tech}
                            </span>
                          ))}
                          {project.technologies.length > 4 && (
                            <span className="px-2 py-0.5 bg-bg-secondary border border-border text-text-secondary rounded-md text-[11px] font-bold">
                              +{project.technologies.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-3 mt-auto pt-3 border-t border-border">
                        {project.projectUrl && (
                          <a
                            href={normalizeExternalUrl(project.projectUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] font-bold text-primary hover:text-primary-hover flex items-center"
                          >
                            <FiGlobe className="mr-1.5" /> Live
                          </a>
                        )}
                        {project.githubUrl && (
                          <a
                            href={normalizeExternalUrl(project.githubUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] font-bold text-text-primary hover:text-black flex items-center"
                          >
                            <FiGithub className="mr-1.5" /> Repo
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Full-Width Contributions Section */}
        <div className="mt-6">
          <div className="bg-bg-secondary rounded-xl shadow-card border border-border">
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 mb-6">
              <h2 className="text-[18px] font-bold text-text-primary">Contributions</h2>
            </div>

            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <div>
                <Tabs.List className="flex space-x-2 border-b border-border overflow-x-auto no-scrollbar px-4 sm:px-6" aria-label="Filter posts">
                    {[
                      { value: 'all', label: 'All Posts' },
                      { value: 'question', label: 'Questions' },
                      { value: 'note', label: 'Notes' },
                      { value: 'article', label: 'Articles' },
                    ].map((tab) => (
                      <Tabs.Trigger
                        key={tab.value}
                        value={tab.value}
                        className={`
                          px-4 py-3 text-[14px] font-bold outline-none transition-colors border-b-2 whitespace-nowrap
                          ${activeTab === tab.value 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-hover'
                          }
                        `}
                      >
                        {tab.label}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>
                </div>

                <div className="px-4 sm:px-6 py-6">
                  <Tabs.Content value={activeTab} className="outline-none">
                    {posts.length === 0 ? (
                      <div className="text-center py-20 bg-bg-primary rounded-xl border border-border border-dashed">
                        <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                          <span className="text-2xl">📝</span>
                        </div>
                        <h3 className="text-[16px] font-bold text-text-primary mb-2">No posts found</h3>
                        <p className="text-[14px] text-text-secondary font-medium">This user hasn't posted anything in this category yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {posts.map((post) => (
                          <PostCard key={post._id} post={post} onDelete={handlePostDelete} />
                        ))}
                      </div>
                    )}
                  </Tabs.Content>
                </div>
              </Tabs.Root>
            </div>
          </div>
        </div>
    </PageShell>
  );
}