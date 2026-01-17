import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/common/Navbar';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Use the common Navbar component */}
      <Navbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Hello, {user?.username}! 👋
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Welcome to your dashboard
          </p>

          {/* User Info Card */}
          <div className="card max-w-2xl mx-auto text-left">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Your Profile</h2>
              <Link to="/edit-profile" className="btn-primary text-sm">
                ✏️ Edit Profile
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={user?.avatar}
                  alt={user?.username}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {user?.username}
                  </p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>

              {user?.bio ? (
                <div>
                  <span className="font-medium text-gray-700">Bio:</span>{' '}
                  <p className="text-gray-600 mt-1">{user?.bio}</p>
                </div>
              ) : (
                <div className="text-gray-500 italic">
                  No bio added yet.{' '}
                  <Link to="/edit-profile" className="text-primary-600 hover:underline">
                    Add one
                  </Link>
                </div>
              )}

              {user?.college && (
                <div>
                  <span className="font-medium text-gray-700">College:</span>{' '}
                  <span className="text-gray-600">{user?.college}</span>
                </div>
              )}

              {user?.yearOfStudy && (
                <div>
                  <span className="font-medium text-gray-700">Year of Study:</span>{' '}
                  <span className="text-gray-600">{user?.yearOfStudy}</span>
                </div>
              )}

              {user?.interests && user.interests.length > 0 ? (
                <div>
                  <span className="font-medium text-gray-700">Interests:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 italic">
                  No interests added yet.{' '}
                  <Link to="/edit-profile" className="text-primary-600 hover:underline">
                    Add some
                  </Link>
                </div>
              )}

              <div className="flex space-x-6 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {user?.reputation || 0}
                  </p>
                  <p className="text-sm text-gray-600">Reputation</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {user?.followersCount || 0}
                  </p>
                  <p className="text-sm text-gray-600">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {user?.followingCount || 0}
                  </p>
                  <p className="text-sm text-gray-600">Following</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon */}
          <div className="mt-12 card max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">🚀 Coming Soon</h2>
            <ul className="text-left space-y-2 text-gray-600">
              <li>• Create and share posts</li>
              <li>• Ask and answer questions</li>
              <li>• Upvote helpful content</li>
              <li>• Build your reputation</li>
              <li>• Connect with other learners</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}